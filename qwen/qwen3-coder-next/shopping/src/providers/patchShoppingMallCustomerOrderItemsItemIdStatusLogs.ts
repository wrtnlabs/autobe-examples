import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemStatusLog";
import { IShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStatusLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemStatusLogTransformer } from "../transformers/ShoppingMallOrderItemStatusLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemsItemIdStatusLogs(props: {
  customer: CustomerPayload;
  itemId: string;
}): Promise<IPageIShoppingMallOrderItemStatusLog> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_status_logs.findMany({
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...ShoppingMallOrderItemStatusLogTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_order_item_status_logs.count({
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemStatusLogTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
