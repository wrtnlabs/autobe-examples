import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommentsCommentIdSortOrdersSortOrderId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  sortOrderId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const record =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findFirst({
      where: {
        id: props.sortOrderId,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
    });
  if (!record) {
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
