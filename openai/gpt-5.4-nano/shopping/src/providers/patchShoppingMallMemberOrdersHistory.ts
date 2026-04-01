import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberOrdersHistory(props: {
  member: MemberPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_customer_id: props.member.id,
    deleted_at: null,
    payment: {
      deleted_at: null,
      status: "succeeded",
    },
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const orderIds = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    select: { id: true },
    orderBy: { placed_at: "desc" },
    skip,
    take: limit,
  });
  const totalRecords = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  const pages = Math.ceil(totalRecords / limit);
  if (orderIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: totalRecords,
        pages,
      },
    };
  }
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: {
        in: orderIds.map((o) => o.id),
      },
      deleted_at: null,
      shopping_customer_id: props.member.id,
      payment: {
        deleted_at: null,
        status: "succeeded",
      },
    },
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  return {
    data: await ArrayUtil.asyncMap(
      orders,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages,
    },
  };
}
