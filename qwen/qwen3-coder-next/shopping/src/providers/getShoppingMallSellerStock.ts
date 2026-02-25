import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryAtSummaryTransformer } from "../transformers/ShoppingMallInventoryHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerStock(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where: {
        shopping_mall_seller_id: props.seller.id,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallInventoryHistoryAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where: {
      shopping_mall_seller_id: props.seller.id,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallInventoryHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
