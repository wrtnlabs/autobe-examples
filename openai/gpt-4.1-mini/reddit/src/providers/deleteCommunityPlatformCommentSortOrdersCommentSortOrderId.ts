import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformCommentSortOrdersCommentSortOrderId(props: {
  commentSortOrderId: string & import("typia").tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_comment_sort_orders.findUniqueOrThrow(
    {
      where: { id: props.commentSortOrderId },
    },
  );
  await MyGlobal.prisma.community_platform_comment_sort_orders.delete({
    where: { id: props.commentSortOrderId },
  });
}
