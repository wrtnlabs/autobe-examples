import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentSortOrderCollector } from "../collectors/CommunityPlatformCommentSortOrderCollector";
import { CommunityPlatformCommentSortOrderTransformer } from "../transformers/CommunityPlatformCommentSortOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformCommentSortOrders(props: {
  body: ICommunityPlatformCommentSortOrder.ICreate;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const data = await CommunityPlatformCommentSortOrderCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.community_platform_comment_sort_orders.create({
      data,
    });
  return await CommunityPlatformCommentSortOrderTransformer.transform(created);
}
