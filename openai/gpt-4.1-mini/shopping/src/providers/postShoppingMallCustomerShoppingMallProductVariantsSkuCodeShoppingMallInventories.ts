import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallProductVariantsSkuCodeShoppingMallInventories(props: {
  customer: CustomerPayload;
  skuCode: string;
  body: IShoppingMallInventory.ICreate;
}): Promise<IShoppingMallInventory> {
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        deleted_at: null,
      },
    });

  if (!productVariant) {
    throw new HttpException(
      `Product variant SKU code '${props.skuCode}' not found`,
      404,
    );
  }

  const nowISOString = toISOStringSafe(new Date());

  const id: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.shopping_mall_inventories.create({
    data: {
      id,
      shopping_mall_product_variant_id: productVariant.id,
      quantity: props.body.quantity,
      reserved_quantity: props.body.reserved_quantity,
      restock_date: props.body.restock_date ?? null,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    quantity: created.quantity,
    reserved_quantity: created.reserved_quantity,
    restock_date:
      created.restock_date !== null && created.restock_date !== undefined
        ? toISOStringSafe(created.restock_date)
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
