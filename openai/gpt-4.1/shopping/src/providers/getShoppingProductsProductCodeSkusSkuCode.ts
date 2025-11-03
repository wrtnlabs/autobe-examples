import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";

export async function getShoppingProductsProductCodeSkusSkuCode(props: {
  productCode: string;
  skuCode: string;
}): Promise<IShoppingSku> {
  // Find the product by business code and ensure it is not soft-deleted.
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Find the SKU (must belong to product) and ensure not soft-deleted.
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      shopping_product_id: product.id,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // Collect SKU variant attributes.
  const variants = await MyGlobal.prisma.shopping_sku_variants.findMany({
    where: { shopping_sku_id: sku.id },
    orderBy: { order_index: "asc" },
  });
  const variant_attributes: IShoppingSku["variant_attributes"] =
    await Promise.all(
      variants.map(async (v) => {
        const attr = await MyGlobal.prisma.shopping_attribute_values.findUnique(
          {
            where: { id: v.shopping_attribute_value_id },
          },
        );
        if (!attr) {
          throw new HttpException("Attribute value not found", 500);
        }
        return {
          id: v.id,
          shopping_attribute_value_id: v.shopping_attribute_value_id,
          order_index: v.order_index,
          attribute_value: {
            id: attr.id,
            shopping_attribute_dimension_id:
              attr.shopping_attribute_dimension_id,
            value_code: attr.value_code,
            display_value: attr.display_value,
            display_order: attr.display_order ?? undefined,
            // description property omitted because it does not exist on attr
            created_at: toISOStringSafe(attr.created_at),
          },
        };
      }),
    );

  // Collect SKU images
  const imagesData = await MyGlobal.prisma.shopping_sku_images.findMany({
    where: { shopping_sku_id: sku.id },
    orderBy: { created_at: "asc" },
  });
  const images: IShoppingSku["images"] = imagesData.map((img) => ({
    id: img.id,
    shopping_sku_id: img.shopping_sku_id,
    image_uri: img.image_uri,
    created_at: toISOStringSafe(img.created_at),
  }));

  // Compose parent product summary
  const product_summary: IShoppingSku["product"] = {
    id: product.id,
    code: product.code,
    name: product.name,
    main_image_uri: product.main_image_uri ?? undefined,
    status: product.status,
  };

  return {
    id: sku.id,
    shopping_product_id: sku.shopping_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    barcode: sku.barcode ?? undefined,
    status: sku.status,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
    variant_attributes,
    product: product_summary,
    images,
  };
}
