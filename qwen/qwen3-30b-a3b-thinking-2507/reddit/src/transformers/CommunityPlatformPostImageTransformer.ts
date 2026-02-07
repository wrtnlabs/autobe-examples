import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostImageTransformer {
    export type Payload = Prisma.community_platform_post_imagesGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                image_url: true,
                thumbnail_url: true,
                image_size: true,
                alt_text: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                post: {
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
                                owner: true,
                            },
                        },
                        author: true,
                        _count: {
                            community_platform_comments: true,
                            community_platform_votes: true,
                        },
                    },
                },
            },
            satisfies, Prisma, : .community_platform_post_imagesFindManyArgs
        };
        export async function transform(input: Payload): Promise<ICommunityPlatformPostImage> {
            return {
                id: input.id,
                imageUrl: input.image_url,
                thumbnailUrl: input.thumbnail_url,
                imageSize: input.image_size ?? undefined,
                altText: input.alt_text ?? undefined,
                createdAt: input.created_at.toISOString(),
                updatedAt: input.updated_at.toISOString(),
                deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
                post: await CommunityPlatformPostAtSummaryTransformer.transform(input.post),
            };
        }
    }
}