import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentSortOrderTransformer } from "../transformers/CommunityPlatformCommentSortOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformCommentSortOrdersCommentSortOrderId(props: {
  commentSortOrderId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSortOrder.IUpdate;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const existing =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findUnique({
      where: { id: props.commentSortOrderId },
      select: { deleted_at: true },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const data: Prisma.community_platform_comment_sort_ordersUpdateInput = {};
  if (props.body.strategy !== undefined) data.strategy = props.body.strategy;
  if (props.body.sortValue !== undefined)
    data.sort_value = props.body.sortValue;
  const updated =
    await MyGlobal.prisma.community_platform_comment_sort_orders.update({
      where: { id: props.commentSortOrderId },
      data,
    });
  return await CommunityPlatformCommentSortOrderTransformer.transform(updated);
}
