import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminCommentsCommentIdSortOrdersSortOrderId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  sortOrderId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const record =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findFirst({
      where: {
        id: props.sortOrderId,
        community_platform_comment_id: props.commentId,
      },
    });
  if (!record) throw new HttpException("Sort order not found", 404);
  return record;
}
