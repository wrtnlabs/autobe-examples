import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { MemberPayload } from "../decorators/payload/MemberPayload"
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer"

export async function getCommunityPlatformMemberFeeds(props: {
    member: MemberPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
    const subscriptions = await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
        where: { user_id: props.member.id },
        select: { community_id: true },
    });
    const communityIds = subscriptions.map((s) => s.community_id);
    const allPosts = await MyGlobal.prisma.community_platform_posts.findMany({
        where: { community_id: { in: communityIds }, deleted_at: null },
        select: {
            id: true,
            title: true,
            content_type: true,
            created_at: true,
            community: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    icon_url: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            created_at: true,
                            updated_at: true,
                        },
                    },
                },
            },
            author: {
                select: {
                    id: true,
                    email: true,
                    created_at: true,
                    updated_at: true,
                },
            },
        },
    });
    const postSummaries = await Promise.all(allPosts.map((post) => CommunityPlatformPostAtSummaryTransformer.transform(post)));
    const calculateHotScore = (post: ICommunityPlatformPost.ISummary) => {
        const createdAt = new Date(post.created_at);
        const now = new Date();
        const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return post.votes + ageInHours * 0.5;
        ;
        postSummaries.sort((a, b) => calculateHotScore(b) - calculateHotScore(a));
        const page = 1;
        const limit = 100;
        const data = postSummaries.slice((page - 1) * limit, page * limit);
        const total = await MyGlobal.prisma.community_platform_posts.count({
            where: { community_id: { in: communityIds }, deleted_at: null },
        });
        const pages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                current: page,
                limit,
                records: total,
                pages,
                satisfies, IPage, : .IPagination,
            }
        };
    };
}
