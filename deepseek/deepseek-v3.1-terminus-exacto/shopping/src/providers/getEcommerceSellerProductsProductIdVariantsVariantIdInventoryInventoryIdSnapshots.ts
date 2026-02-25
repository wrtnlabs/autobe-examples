import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventorySnapshot";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceInventorySnapshotTransformer } from "../transformers/EcommerceInventorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceSellerProductsProductIdVariantsVariantIdInventoryInventoryIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceInventorySnapshot> {
  // First verify that the seller owns the product
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Verify the variant belongs to the product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      product: { id: props.productId },
      deleted_at: null,
    },
  });
  if (!variant) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // Verify the inventory record belongs to the variant AND seller
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_inventory_records.findFirst({
      where: {
        id: props.inventoryId,
        variant: { id: props.variantId },
        seller: { id: props.seller.id },
        deleted_at: null,
      },
    });
  if (!inventoryRecord) {
    throw new HttpException("Inventory record not found or access denied", 404);
  }
  // Query the snapshot with proper authorization
  const snapshot =
    await MyGlobal.prisma.ecommerce_inventory_snapshots.findFirstOrThrow({
      where: {
        ecommerce_inventory_record_id: props.inventoryId,
      },
      ...EcommerceInventorySnapshotTransformer.select(),
    });
  return await EcommerceInventorySnapshotTransformer.transform(snapshot);
}
