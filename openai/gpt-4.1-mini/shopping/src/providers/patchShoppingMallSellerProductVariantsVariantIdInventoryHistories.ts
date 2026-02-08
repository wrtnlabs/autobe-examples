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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductVariantsVariantIdInventoryHistories(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
  } satisfies Prisma.shopping_mall_inventory_historiesWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        quantity_delta: true,
        reason: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where: whereInput,
  });
  return {
    data: records.map((record) => ({
      id: record.id,
      quantity_delta: record.quantity_delta,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
