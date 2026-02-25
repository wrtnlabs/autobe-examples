import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdDeletedContents(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformDeletedContent.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Fix filter: use post relation with community filter
  // use comment relation with community filter correctly (likely comment's post relation)
  const data =
    await MyGlobal.prisma.community_platform_deleted_contents.findMany({
      where: {
        OR: [
          {
            post_id: { not: null },
            post: {
              community_id: props.communityId,
            },
          },
          {
            comment_id: { not: null },
            comment: {
              post: {
                community_id: props.communityId,
              },
            },
          },
        ],
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator_id: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        user_id: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        post_id: true,
        comment_id: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_deleted_contents.count(
    {
      where: {
        OR: [
          {
            post_id: { not: null },
            post: {
              community_id: props.communityId,
            },
          },
          {
            comment_id: { not: null },
            comment: {
              post: {
                community_id: props.communityId,
              },
            },
          },
        ],
      },
    },
  );
  const mappedData: ICommunityPlatformDeletedContent.ISummary[] =
    await Promise.all(
      data.map(async (record) => ({
        id: record.id,
        reason: record.reason,
        createdAt: toISOStringSafe(record.created_at),
        updatedAt: toISOStringSafe(record.updated_at),
        deletedAt: record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : null,
        moderatorId: record.moderator_id,
        moderator: {
          id: record.moderator.id,
          displayName: record.moderator.display_name,
          avatarUrl: record.moderator.avatar_url ?? null,
          karma: record.moderator.karma,
          createdAt: toISOStringSafe(record.moderator.created_at),
          updatedAt: toISOStringSafe(record.moderator.updated_at),
          deletedAt: record.moderator.deleted_at
            ? toISOStringSafe(record.moderator.deleted_at)
            : null,
        },
        userId: record.user_id,
        user: {
          id: record.user.id,
          email: record.user.email,
          username: record.user.username,
          displayName: record.user.display_name,
          bio: record.user.bio ?? null,
          avatarUrl: record.user.avatar_url ?? null,
          karma: record.user.karma,
          createdAt: toISOStringSafe(record.user.created_at),
          updatedAt: toISOStringSafe(record.user.updated_at),
          deletedAt: record.user.deleted_at
            ? toISOStringSafe(record.user.deleted_at)
            : null,
        },
        postId: record.post_id ?? null,
        commentId: record.comment_id ?? null,
      })),
    );
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
