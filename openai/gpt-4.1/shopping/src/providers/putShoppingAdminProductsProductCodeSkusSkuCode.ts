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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminProductsProductCodeSkusSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingSku.IUpdate;
}): Promise<IShoppingSku> {
  // 1. Find the product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Find the SKU by code & product FK
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: props.skuCode },
  });
  if (!sku || sku.shopping_product_id !== product.id) {
    throw new HttpException("SKU not found for this product", 404);
  }

  // 3. Update SKU only with allowed mutable fields
  const updated = await MyGlobal.prisma.shopping_skus.update({
    where: { id: sku.id },
    data: {
      price: props.body.price ?? undefined,
      is_active: props.body.is_active ?? undefined,
      barcode:
        props.body.barcode === undefined ? undefined : props.body.barcode,
      status: props.body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Resolve variant attributes for this SKU (variant attributes list)
  const variantAttributes =
    await MyGlobal.prisma.shopping_sku_variants.findMany({
      where: { shopping_sku_id: sku.id },
      orderBy: { order_index: "asc" },
      include: {
        attributeValue: true,
      },
    });

  // 5. Resolve images for this SKU
  const images = await MyGlobal.prisma.shopping_sku_images.findMany({
    where: { shopping_sku_id: sku.id },
    orderBy: { created_at: "asc" },
  });

  // 6. Compose product summary
  const productSummary = {
    id: product.id,
    code: product.code,
    name: product.name,
    main_image_uri: product.main_image_uri ?? undefined,
    status: product.status,
  };

  // 7. Compose IShoppingSku object for return
  return {
    id: updated.id,
    shopping_product_id: updated.shopping_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    is_active: updated.is_active,
    barcode:
      typeof updated.barcode === "string"
        ? updated.barcode
        : updated.barcode === null
          ? null
          : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    variant_attributes: variantAttributes.map((va) => ({
      id: va.id,
      shopping_attribute_value_id: va.shopping_attribute_value_id,
      order_index: va.order_index,
      attribute_value: {
        id: va.attributeValue.id,
        shopping_attribute_dimension_id:
          va.attributeValue.shopping_attribute_dimension_id,
        value_code: va.attributeValue.value_code,
        display_value: va.attributeValue.display_value,
        display_order: va.attributeValue.display_order ?? undefined,
        created_at: toISOStringSafe(va.attributeValue.created_at),
      },
    })),
    product: productSummary,
    images: images.map((img) => ({
      id: img.id,
      shopping_sku_id: img.shopping_sku_id,
      image_uri: img.image_uri,
      created_at: toISOStringSafe(img.created_at),
    })),
  };
}
