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

export async function postShoppingAdminProductsProductCodeSkus(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingSku.ICreate;
}): Promise<IShoppingSku> {
  const { admin, productCode, body } = props;
  // 1. Find product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: productCode, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Check for duplicate SKU code for this platform
  const existingSKU = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: body.sku_code },
  });
  if (existingSKU) {
    throw new HttpException("Duplicate SKU code", 409);
  }

  // 3. Create SKU row
  const now = toISOStringSafe(new Date());
  let createdSKU;
  try {
    createdSKU = await MyGlobal.prisma.shopping_skus.create({
      data: {
        id: v4(),
        shopping_product_id: product.id,
        sku_code: body.sku_code,
        price: body.price,
        is_active: body.is_active,
        barcode: body.barcode ?? null,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Duplicate SKU code", 409);
    }
    throw err;
  }

  // 4. Create variant attribute rows
  const variants = await Promise.all(
    body.variant_attribute_value_ids.map(async (attributeValueId, idx) => {
      const variant = await MyGlobal.prisma.shopping_sku_variants.create({
        data: {
          id: v4(),
          shopping_sku_id: createdSKU.id,
          shopping_attribute_value_id: attributeValueId,
          order_index: idx,
        },
        include: {
          attributeValue: true,
        },
      });
      return {
        id: variant.id,
        shopping_attribute_value_id: variant.shopping_attribute_value_id,
        order_index: variant.order_index,
        attribute_value: {
          id: variant.attributeValue.id,
          shopping_attribute_dimension_id:
            variant.attributeValue.shopping_attribute_dimension_id,
          value_code: variant.attributeValue.value_code,
          display_value: variant.attributeValue.display_value,
          display_order: variant.attributeValue.display_order ?? undefined,
          created_at: toISOStringSafe(variant.attributeValue.created_at),
        },
      };
    }),
  );

  // 5. Compose product summary for response
  const productSummary = {
    id: product.id,
    code: product.code,
    name: product.name,
    main_image_uri: product.main_image_uri ?? undefined,
    status: product.status,
  };

  // 6. Compose response object (images = empty array at creation)
  return {
    id: createdSKU.id,
    shopping_product_id: createdSKU.shopping_product_id,
    sku_code: createdSKU.sku_code,
    price: createdSKU.price,
    is_active: createdSKU.is_active,
    barcode: createdSKU.barcode ?? undefined,
    status: createdSKU.status,
    created_at: toISOStringSafe(createdSKU.created_at),
    updated_at: toISOStringSafe(createdSKU.updated_at),
    deleted_at:
      createdSKU.deleted_at === null
        ? undefined
        : toISOStringSafe(createdSKU.deleted_at),
    variant_attributes: variants,
    product: productSummary,
    images: [],
  };
}
