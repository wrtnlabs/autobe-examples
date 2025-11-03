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

export async function postShoppingSellerProductsProductCodeSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingSku.ICreate;
}): Promise<IShoppingSku> {
  const { seller, productCode, body } = props;
  // 1. Fetch product, check seller owns it & not deleted
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: { code: productCode, deleted_at: null },
    select: {
      id: true,
      code: true,
      name: true,
      main_image_uri: true,
      status: true,
      shopping_seller_id: true,
    },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_seller_id !== seller.id)
    throw new HttpException("Forbidden: You do not own this product", 403);

  // 2. Validate at least one variant attribute value
  if (
    !body.variant_attribute_value_ids ||
    body.variant_attribute_value_ids.length < 1
  ) {
    throw new HttpException(
      "At least one variant attribute value ID required",
      400,
    );
  }

  // 3. Enforce SKU code uniqueness (active SKUs only)
  const skuExists = await MyGlobal.prisma.shopping_skus.findFirst({
    where: { sku_code: body.sku_code, deleted_at: null },
    select: { id: true },
  });
  if (skuExists) throw new HttpException("SKU code already exists", 409);

  // 4. Create SKU
  const now = toISOStringSafe(new Date());
  const createdSku = await MyGlobal.prisma.shopping_skus.create({
    data: {
      id: v4(),
      shopping_product_id: product.id,
      sku_code: body.sku_code,
      price: body.price,
      is_active: body.is_active,
      barcode: body.barcode === undefined ? undefined : body.barcode,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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

  // 5. Insert variant attribute assignments, build output variants array
  const variants: IShoppingSkuVariant[] = [];
  for (let idx = 0; idx < body.variant_attribute_value_ids.length; ++idx) {
    const attrValueId = body.variant_attribute_value_ids[idx];
    const variantRow = await MyGlobal.prisma.shopping_sku_variants.create({
      data: {
        id: v4(),
        shopping_sku_id: createdSku.id,
        shopping_attribute_value_id: attrValueId,
        order_index: idx,
      },
      select: {
        id: true,
        shopping_attribute_value_id: true,
        order_index: true,
        attributeValue: {
          select: {
            id: true,
            shopping_attribute_dimension_id: true,
            value_code: true,
            display_value: true,
            display_order: true,
            created_at: true,
          },
        },
      },
    });
    variants.push({
      id: variantRow.id,
      shopping_attribute_value_id: variantRow.shopping_attribute_value_id,
      order_index: variantRow.order_index,
      attribute_value: {
        id: variantRow.attributeValue.id,
        shopping_attribute_dimension_id:
          variantRow.attributeValue.shopping_attribute_dimension_id,
        value_code: variantRow.attributeValue.value_code,
        display_value: variantRow.attributeValue.display_value,
        display_order: variantRow.attributeValue.display_order ?? undefined,
        // IShoppingAttributeValue.description is optional so we provide undefined
        description: undefined,
        created_at: toISOStringSafe(variantRow.attributeValue.created_at),
      },
    });
  }

  // 6. Compose product summary object
  const productSummary: IShoppingProduct.ISummary = {
    id: product.id,
    code: product.code,
    name: product.name,
    main_image_uri: product.main_image_uri ?? undefined,
    status: product.status,
  };

  // 7. Final SKU DTO output
  return {
    id: createdSku.id,
    shopping_product_id: createdSku.shopping_product_id,
    sku_code: createdSku.sku_code,
    price: createdSku.price,
    is_active: createdSku.is_active,
    barcode:
      createdSku.barcode === null || createdSku.barcode === undefined
        ? undefined
        : createdSku.barcode,
    status: createdSku.status,
    created_at: toISOStringSafe(createdSku.created_at),
    updated_at: toISOStringSafe(createdSku.updated_at),
    deleted_at:
      createdSku.deleted_at === null || createdSku.deleted_at === undefined
        ? undefined
        : toISOStringSafe(createdSku.deleted_at),
    variant_attributes: variants,
    product: productSummary,
    images: [],
  };
}
