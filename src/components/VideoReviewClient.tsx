'use client'

import dynamic from 'next/dynamic'

const VideoReview = dynamic(() => import('./VideoReview'), { ssr: false })

export default VideoReview
