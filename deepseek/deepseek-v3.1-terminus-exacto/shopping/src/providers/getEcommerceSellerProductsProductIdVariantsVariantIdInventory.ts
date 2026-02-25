import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceInventoryRecordTransformer } from "../transformers/EcommerceInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceInventoryRecord> {
  // Verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Verify the variant exists and belongs to the product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!variant) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // Query all inventory records for this variant (no pagination as specified)
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_inventory_records.findMany({
      where: {
        ecommerce_product_variant_id: props.variantId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      ...EcommerceInventoryRecordTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_inventory_records.count({
    where: {
      ecommerce_product_variant_id: props.variantId,
      deleted_at: null,
    },
  });
  // Transform all records
  const transformedRecords = await ArrayUtil.asyncMap(
    inventoryRecords,
    EcommerceInventoryRecordTransformer.transform,
  );
  return {
    data: transformedRecords,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
