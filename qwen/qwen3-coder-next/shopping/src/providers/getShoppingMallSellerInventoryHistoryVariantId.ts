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

export async function getShoppingMallSellerInventoryHistoryVariantId(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IPageIShoppingMallInventoryHistory> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where: {
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where: {
      shopping_mall_product_variant_id: props.variantId,
      deleted_at: null,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id as string,
      shopping_mall_product_variant_id:
        record.shopping_mall_product_variant_id as string,
      actor_id: record.actor_id === null ? undefined : record.actor_id,
      quantity: record.quantity,
      reason: record.reason,
      transaction_type: record.transaction_type,
      transaction_ref_id:
        record.transaction_ref_id === null
          ? undefined
          : (record.transaction_ref_id as string),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null
          ? undefined
          : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
