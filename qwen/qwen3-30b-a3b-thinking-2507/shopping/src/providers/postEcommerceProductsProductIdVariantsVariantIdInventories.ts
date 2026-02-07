import { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceInventoryCollector } from "../collectors/EcommerceInventoryCollector";
import { EcommerceInventoryTransformer } from "../transformers/EcommerceInventoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceProductsProductIdVariantsVariantIdInventories(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceInventory.ICreate;
}): Promise<IEcommerceInventory> {
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.variantId },
  });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.products_id !== props.productId) {
    throw new HttpException("Variant does not belong to the product", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_inventories.create({
    data: await EcommerceInventoryCollector.collect({
      body: props.body,
      ecommerceProductVariants: { id: props.variantId },
    }),
    ...EcommerceInventoryTransformer.select(),
  });
  return await EcommerceInventoryTransformer.transform(created);
}
