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

export async function patchCommunityPlatformModeratorDeletedContents(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformDeletedContent.IRequest;
}): Promise<IPageICommunityPlatformDeletedContent.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 20;
  const whereInput: Prisma.community_platform_deleted_contentsWhereInput = {
    moderator_id: props.body.moderator_id ?? undefined,
    user_id: props.body.user_id ?? undefined,
    post_id: props.body.post_id ?? undefined,
    comment_id: props.body.comment_id ?? undefined,
    created_at: {
      ...(props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null
        ? { gte: props.body.createdAfter }
        : {}),
      ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null
        ? { lte: props.body.createdBefore }
        : {}),
    },
  };
  const dataRaw =
    await MyGlobal.prisma.community_platform_deleted_contents.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
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
            display_name: true,
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
  const total = await MyGlobal.prisma.community_platform_deleted_contents.count(
    {
      where: whereInput,
    },
  );
  function toDateTimeString(value: unknown): string & tags.Format<"date-time"> {
    if (typeof value === "string")
      return value as string & tags.Format<"date-time">;
    return new Date(value as string | number).toISOString() as string &
      tags.Format<"date-time">;
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: dataRaw.map((record) => ({
      id: record.id,
      reason: record.reason,
      createdAt:
        typeof record.created_at === "string"
          ? record.created_at
          : (record.created_at.toISOString() as string &
              tags.Format<"date-time">),
      updatedAt:
        typeof record.updated_at === "string"
          ? record.updated_at
          : (record.updated_at.toISOString() as string &
              tags.Format<"date-time">),
      deletedAt:
        record.deleted_at === null
          ? null
          : typeof record.deleted_at === "string"
            ? record.deleted_at
            : (record.deleted_at.toISOString() as string &
                tags.Format<"date-time">),
      moderatorId: record.moderator_id,
      userId: record.user_id,
      postId: record.post_id,
      commentId: record.comment_id,
      moderator: {
        id: record.moderator.id,
        displayName: record.moderator.display_name,
        karma: record.moderator.karma,
        createdAt:
          typeof record.moderator.created_at === "string"
            ? record.moderator.created_at
            : (record.moderator.created_at.toISOString() as string &
                tags.Format<"date-time">),
        updatedAt:
          typeof record.moderator.updated_at === "string"
            ? record.moderator.updated_at
            : (record.moderator.updated_at.toISOString() as string &
                tags.Format<"date-time">),
        deletedAt:
          record.moderator.deleted_at === null
            ? null
            : typeof record.moderator.deleted_at === "string"
              ? record.moderator.deleted_at
              : (record.moderator.deleted_at.toISOString() as string &
                  tags.Format<"date-time">),
      },
      user: {
        id: record.user.id,
        email: record.user.email,
        username: record.user.username,
        displayName: record.user.display_name,
        bio: record.user.bio ?? null,
        avatarUrl: record.user.avatar_url ?? null,
        karma: record.user.karma,
        createdAt:
          typeof record.user.created_at === "string"
            ? record.user.created_at
            : (record.user.created_at.toISOString() as string &
                tags.Format<"date-time">),
        updatedAt:
          typeof record.user.updated_at === "string"
            ? record.user.updated_at
            : (record.user.updated_at.toISOString() as string &
                tags.Format<"date-time">),
        deletedAt:
          record.user.deleted_at === null
            ? null
            : typeof record.user.deleted_at === "string"
              ? record.user.deleted_at
              : (record.user.deleted_at.toISOString() as string &
                  tags.Format<"date-time">),
      },
    })),
  };
}
