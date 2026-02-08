import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
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

export async function getCommunityPlatformModeratorCommentsCommentIdSortOrdersSortOrderId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  sortOrderId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const record =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findUnique({
      where: { id: props.sortOrderId },
      select: {
        id: true,
        community_platform_comment_id: true,
        strategy: true,
        sort_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record || record.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Sort order not found", 404);
  }
  return {
    id: record.id,
    community_platform_comment_id: record.community_platform_comment_id,
    strategy: record.strategy,
    sort_value: record.sort_value,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
