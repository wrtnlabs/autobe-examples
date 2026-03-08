import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // 1. Verify product exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
    });
  // 2. Check ownership - seller must own the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Access denied: You do not own this product", 403);
  }
  // 3. Create image using collector
  const createInput = await ShoppingMallProductImageCollector.collect({
    body: props.body,
    shoppingMallProducts: { id: props.productId },
  });
  // 4. Insert into database with transformer select for response
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: createInput,
    ...ShoppingMallProductImageTransformer.select(),
  });
  // 5. Transform and return
  return await ShoppingMallProductImageTransformer.transform(created);
}
