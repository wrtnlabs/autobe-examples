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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdDeletedContents(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformDeletedContent.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_deleted_contents.findMany({
      where: {
        OR: [
          { post: { community_id: props.communityId } },
          { comment: { post: { community_id: props.communityId } } },
        ],
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            username: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
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
          { post: { community_id: props.communityId } },
          { comment: { post: { community_id: props.communityId } } },
        ],
      },
    },
  );
  return {
    data: data.map((record) => ({
      id: record.id,
      reason: record.reason,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      moderatorId: record.moderator.id,
      userId: record.user.id,
      postId: record.post_id,
      commentId: record.comment_id,
      moderator: {
        id: record.moderator.id,
        displayName: record.moderator.display_name,
        username: record.moderator.username,
        avatarUrl: record.moderator.avatar_url ?? null,
        karma: record.moderator.karma,
        createdAt: toISOStringSafe(record.moderator.created_at),
        updatedAt: toISOStringSafe(record.moderator.updated_at),
        deletedAt: record.moderator.deleted_at
          ? toISOStringSafe(record.moderator.deleted_at)
          : null,
      },
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
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
