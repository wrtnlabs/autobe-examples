import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.ICreate;
}): Promise<IShoppingMallSku> {
  const { seller, productId, body } = props;

  // STEP 1: Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you do not have permission to add SKUs to this product",
      404,
    );
  }

  // STEP 2: Check for duplicate SKU code
  const existingSku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      sku_code: body.sku_code,
    },
  });

  if (existingSku) {
    throw new HttpException(
      "SKU code already exists. Please use a unique SKU code",
      409,
    );
  }

  // STEP 3: Create SKU with required fields
  const now = toISOStringSafe(new Date());
  const skuId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_skus.create({
    data: {
      id: skuId,
      shopping_mall_product_id: productId,
      sku_code: body.sku_code,
      price: body.price,
      available_quantity: 0,
      reserved_quantity: 0,
      low_stock_threshold: 10,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // STEP 4: Return mapped response
  return {
    id: created.id as string & tags.Format<"uuid">,
    sku_code: created.sku_code,
    price: created.price,
  };
}
