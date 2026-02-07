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
import { GuestPayload } from "../decorators/payload/GuestPayload"

export async function getCommunityPlatformGuestFeedPopular(props: {
    guest: GuestPayload;
    page?: number;
}): Promise<IPageICommunityPlatformPost.ISummary> {
    const currentPage = props.page ?? 1;
    const limit = 20;
    const skip = (currentPage - 1) * limit;
    const data = await MyGlobal.prisma.community_platform_posts.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: [{ created_at: "desc" }]
    }, select, {
        id: true,
        title: true,
        content_type: true,
        created_at: true,
        community_id: true,
        author_id: true,
    });
}
;
const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { deleted_at: null },
});
const transformedData = await Promise.all(data.map(async (post) => {
    const community = await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: post.community_id },
        select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner_id: true
        },
    });
    let communitySummary: ICommunityPlatformCommunity.ISummary;
    if (!community) {
        communitySummary = {
            id: post.community_id as string & tags.Format<"uuid">,
            name: "Deleted Community",
            description: null,
            icon_url: null,
            created_at: "1970-01-01T00:00:00.000Z",
            updated_at: "1970-01-01T00:00:00.000Z",
            deleted_at: null,
            owner: {
                id: "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
                name: "System"
            }
        };
    }
    else {
        const owner = await MyGlobal.prisma.community_platform_members.findUnique({
            where: { id: community.owner_id },
            select: { id: true }
        });
        const ownerName = owner?.id || "System";
        communitySummary = {
            id: community.id as string & tags.Format<"uuid">,
            name: community.name,
            description: community.description,
            icon_url: community.icon_url,
            created_at: toISOStringSafe(community.created_at),
            updated_at: toISOStringSafe(community.updated_at),
            deleted_at: community.deleted_at
                ? toISOStringSafe(community.deleted_at)
                : null,
            owner: {
                id: owner?.id as string & tags.Format<"uuid">,
                name: ownerName
            }
        };
    }
    const author = await MyGlobal.prisma.community_platform_members.findUnique({
        where: { id: post.author_id },
        select: { id: true }
    });
    const authorName = author?.id || "Guest";
    const authorSummary: ICommunityPlatformMember.ISummary = {
        id: author?.id as string & tags.Format<"uuid">,
        name: authorName
    };
    return {
        id: post.id as string & tags.Format<"uuid">,
        title: post.title,
        content_type: post.content_type,
        community: communitySummary,
        author: authorSummary,
        created_at: toISOStringSafe(post.created_at),
        comments_count: 0,
        votes: 0
    };
}));
return {
    data: transformedData,
    pagination: {
        current: currentPage,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
    },
};
