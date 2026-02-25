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

export async function patchCommunityPlatformAdminDeletedContents(props: {
  admin: AdminPayload;
  body: ICommunityPlatformDeletedContent.IRequest;
}): Promise<IPageICommunityPlatformDeletedContent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const isValidDateTime = (
    value?: string | null,
  ): value is string & tags.Format<"date-time"> => {
    if (!value) return false;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    return iso8601Regex.test(value);
  };
  if (props.body.createdAfter && !isValidDateTime(props.body.createdAfter)) {
    throw new HttpException(
      "createdAfter must be ISO 8601 datetime string",
      400,
    );
  }
  if (props.body.createdBefore && !isValidDateTime(props.body.createdBefore)) {
    throw new HttpException(
      "createdBefore must be ISO 8601 datetime string",
      400,
    );
  }
  const where: Prisma.community_platform_deleted_contentsWhereInput = {};
  const andConditions: Prisma.community_platform_deleted_contentsWhereInput[] =
    [];
  if (props.body.moderator_id) {
    andConditions.push({ moderator_id: props.body.moderator_id });
  }
  if (props.body.user_id) {
    andConditions.push({ user_id: props.body.user_id });
  }
  if (props.body.post_id !== undefined) {
    andConditions.push({ post_id: props.body.post_id });
  }
  if (props.body.comment_id !== undefined) {
    andConditions.push({ comment_id: props.body.comment_id });
  }
  if (props.body.createdAfter) {
    andConditions.push({
      created_at: { gte: toISOStringSafe(new Date(props.body.createdAfter)) },
    });
  }
  if (props.body.createdBefore) {
    andConditions.push({
      created_at: { lte: toISOStringSafe(new Date(props.body.createdBefore)) },
    });
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }
  const total = await MyGlobal.prisma.community_platform_deleted_contents.count(
    { where },
  );
  const skip = (page - 1) * limit;
  const rawData =
    await MyGlobal.prisma.community_platform_deleted_contents.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator_id: true,
        user_id: true,
        post_id: true,
        comment_id: true,
        moderator: {
          select: {
            id: true,
            username: true,
            display_name: true,
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
      },
    });
  const data = rawData.map((item) => ({
    id: item.id,
    reason: item.reason,
    createdAt: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(item.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    moderatorId: item.moderator_id,
    userId: item.user_id,
    postId: item.post_id,
    commentId: item.comment_id,
    moderator: {
      id: item.moderator.id,
      username: item.moderator.username,
      displayName: item.moderator.display_name,
      avatarUrl: item.moderator.avatar_url ?? null,
      karma: item.moderator.karma,
      createdAt: toISOStringSafe(item.moderator.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(item.moderator.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: item.moderator.deleted_at
        ? toISOStringSafe(item.moderator.deleted_at)
        : null,
    },
    user: {
      id: item.user.id,
      email: item.user.email,
      username: item.user.username,
      displayName: item.user.display_name,
      bio: item.user.bio ?? null,
      avatarUrl: item.user.avatar_url ?? null,
      karma: item.user.karma,
      createdAt: toISOStringSafe(item.user.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(item.user.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: item.user.deleted_at
        ? toISOStringSafe(item.user.deleted_at)
        : null,
    },
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
