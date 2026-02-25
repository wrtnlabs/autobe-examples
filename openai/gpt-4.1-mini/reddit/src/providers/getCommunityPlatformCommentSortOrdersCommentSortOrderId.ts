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

export async function getCommunityPlatformCommentSortOrdersCommentSortOrderId(props: {
  commentSortOrderId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSortOrder> {
  const record =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findUniqueOrThrow(
      {
        where: { id: props.commentSortOrderId },
        ...CommunityPlatformCommentSortOrderTransformer.select(),
      },
    );
  return CommunityPlatformCommentSortOrderTransformer.transform(record);
}
