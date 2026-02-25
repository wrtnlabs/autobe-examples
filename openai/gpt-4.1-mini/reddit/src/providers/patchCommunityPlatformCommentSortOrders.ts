import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSortOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommentSortOrders(props: {
  body: ICommunityPlatformCommentSortOrder.IRequest;
}): Promise<IPageICommunityPlatformCommentSortOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.strategy ? { strategy: props.body.strategy } : {}),
    deleted_at: null,
  } satisfies Prisma.community_platform_comment_sort_ordersWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sort_value: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_sort_orders.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      communityPlatformCommentId: item.community_platform_comment_id,
      strategy: item.strategy,
      sortValue: item.sort_value,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
