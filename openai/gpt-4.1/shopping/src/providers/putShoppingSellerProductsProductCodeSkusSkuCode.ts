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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerProductsProductCodeSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingSku.IUpdate;
}): Promise<IShoppingSku> {
  // 1. Find the product owned by this seller and not deleted
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      shopping_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      main_image_uri: true,
      status: true,
    },
  });
  if (!product)
    throw new HttpException("Product not found or access denied", 404);

  // 2. Find the SKU by code, belonging to the product, not deleted
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      shopping_product_id: product.id,
      sku_code: props.skuCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sku) throw new HttpException("SKU not found for this product", 404);

  // 3. Update SKU fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_skus.update({
    where: { id: sku.id },
    data: {
      price: props.body.price ?? undefined,
      is_active: props.body.is_active ?? undefined,
      barcode:
        props.body.barcode === undefined ? undefined : props.body.barcode,
      status: props.body.status ?? undefined,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_product_id: true,
      sku_code: true,
      price: true,
      is_active: true,
      barcode: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // 4. Get all variant records for this SKU
  const variants = await MyGlobal.prisma.shopping_sku_variants.findMany({
    where: { shopping_sku_id: updated.id },
    orderBy: { order_index: "asc" },
    select: {
      id: true,
      shopping_attribute_value_id: true,
      order_index: true,
    },
  });

  // 4b. For all variant attribute value IDs, get all attribute value objects in batch
  const attributeValueIds = variants.map((v) => v.shopping_attribute_value_id);
  const attrValuesArr =
    attributeValueIds.length > 0
      ? await MyGlobal.prisma.shopping_attribute_values.findMany({
          where: { id: { in: attributeValueIds } },
          select: {
            id: true,
            shopping_attribute_dimension_id: true,
            value_code: true,
            display_value: true,
            display_order: true,
            created_at: true,
          },
        })
      : [];
  // Make a map for efficient lookup
  const attrValueMap = new Map(attrValuesArr.map((av) => [av.id, av]));

  const variant_attributes = variants.map((v) => {
    const attrVal = attrValueMap.get(v.shopping_attribute_value_id);
    return {
      id: v.id,
      shopping_attribute_value_id: v.shopping_attribute_value_id,
      order_index: v.order_index,
      attribute_value: attrVal
        ? {
            id: attrVal.id,
            shopping_attribute_dimension_id:
              attrVal.shopping_attribute_dimension_id,
            value_code: attrVal.value_code,
            display_value: attrVal.display_value,
            display_order: attrVal.display_order ?? undefined,
            description: undefined, // Cannot be fetched, not in schema
            created_at: toISOStringSafe(attrVal.created_at),
          }
        : {
            id: v.shopping_attribute_value_id,
            shopping_attribute_dimension_id: "" as string & tags.Format<"uuid">,
            value_code: "",
            display_value: "",
            display_order: undefined,
            description: undefined,
            created_at: toISOStringSafe(new Date()),
          },
    };
  });

  // 5. Get SKU images
  const images = await MyGlobal.prisma.shopping_sku_images.findMany({
    where: { shopping_sku_id: updated.id },
    orderBy: { created_at: "asc" },
  });
  const sku_images = images.map((img) => ({
    id: img.id,
    shopping_sku_id: img.shopping_sku_id,
    image_uri: img.image_uri,
    created_at: toISOStringSafe(img.created_at),
  }));

  // 6. Product summary for parent product
  const productSummary = {
    id: product.id,
    code: product.code,
    name: product.name,
    main_image_uri: product.main_image_uri ?? undefined,
    status: product.status,
  };

  // 7. Build IShoppingSku
  return {
    id: updated.id,
    shopping_product_id: updated.shopping_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    is_active: updated.is_active,
    barcode: updated.barcode === null ? null : updated.barcode,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    variant_attributes,
    product: productSummary,
    images: sku_images,
  };
}
