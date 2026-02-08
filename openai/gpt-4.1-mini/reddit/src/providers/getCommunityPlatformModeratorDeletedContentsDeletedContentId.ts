import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformModeratorDeletedContentsDeletedContentId(props: {
  moderator: ModeratorPayload;
  deletedContentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformDeletedContent> {
  const record =
    await MyGlobal.prisma.community_platform_deleted_contents.findUnique({
      where: { id: props.deletedContentId },
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
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });
  if (!record) throw new HttpException("Deleted content not found", 404);
  return {
    id: record.id,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    moderator: record.moderator
      ? {
          id: record.moderator.id,
          display_name: record.moderator.display_name,
          email: record.moderator.email,
        }
      : null,
    user: record.user
      ? {
          id: record.user.id,
          display_name: record.user.display_name,
          email: record.user.email,
        }
      : null,
    post: record.post
      ? {
          id: record.post.id,
          title: record.post.title,
        }
      : null,
    comment: record.comment
      ? {
          id: record.comment.id,
          content: record.comment.content,
        }
      : null,
  };
}
