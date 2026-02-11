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
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";


export async function patchCommunityPosts(props: {
    body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
    const { feed_type = "home", sort_by = "hot", page = 1, limit = 100 = props.body };
    const whereInput = {
        deleted_at: null,
        satisfies, Prisma, : .community_postsWhereInput,
        const: orderByInput = (sort_by === "hot"
            ? { created_at: "desc" as const }
            : sort_by === "new"
                ? { created_at: "desc" as const }
                : sort_by === "top"
                    ? { created_at: "desc" as const }
                    : { created_at: "desc" as const }) satisfies Prisma.community_postsOrderByWithRelationInput,
        const: data = await MyGlobal.prisma.community_posts.findMany({
            where: whereInput,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: orderByInput,
            select: {
                id: true,
                title: true,
                type: true,
                created_at: true,
                author: {
                    select: {
                        id: true,
                        display_name: true,
                        avatar_url: true,
                        created_at: true,
                        deleted_at: true,
                    },
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        icon_url: true,
                        owner: {
                            select: {
                                id: true,
                                display_name: true,
                                avatar_url: true,
                                created_at: true,
                                deleted_at: true,
                            },
                        },
                        created_at: true,
                        deleted_at: true,
                    },
                },
            },
        }),
        const: total = await MyGlobal.prisma.community_posts.count({
            where: whereInput,
        }),
        const: transformedData = data.map((post) => ({
            id: post.id,
            title: post.title,
            type: post.type,
            created_at: toISOStringSafe(post.created_at),
            author: {
                id: post.author.id,
                display_name: post.author.display_name ?? null,
                avatar_url: post.author.avatar_url ?? null,
                created_at: toISOStringSafe(post.author.created_at),
                deleted_at: post.author.deleted_at
                    ? toISOStringSafe(post.author.deleted_at)
                    : null,
            },
            community: {
                id: post.community.id,
                name: post.community.name,
                description: post.community.description ?? null,
                icon_url: post.community.icon_url ?? null,
                owner: {
                    id: post.community.owner.id,
                    display_name: post.community.owner.display_name ?? null,
                    avatar_url: post.community.owner.avatar_url ?? null,
                    created_at: toISOStringSafe(post.community.owner.created_at),
                    deleted_at: post.community.owner.deleted_at
                        ? toISOStringSafe(post.community.owner.deleted_at)
                        : null,
                },
                created_at: toISOStringSafe(post.community.created_at),
                deleted_at: post.community.deleted_at
                    ? toISOStringSafe(post.community.deleted_at)
                    : null,
            },
            comments_count: 0
        })),
        return: {
            data: transformedData,
            pagination: {
                current: page,
                limit,
                records: total,
                pages: Math.ceil(total / limit),
                satisfies, IPage, : .IPagination,
            }
        }
    };
}
