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
  productId: string;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // 1. Verify product exists, not deleted, and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: { id: true, shopping_mall_seller_id: true },
    },
  );
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Calculate display_order if not provided
  let displayOrder: number;
  if (props.body.displayOrder !== undefined) {
    displayOrder = props.body.displayOrder;
  } else {
    const maxOrder =
      await MyGlobal.prisma.shopping_mall_product_images.aggregate({
        where: { shopping_mall_product_id: props.productId },
        _max: { display_order: true },
      });
    displayOrder = (maxOrder._max.display_order ?? -1) + 1;
  }
  // 3. Create image record using Collector
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: await ShoppingMallProductImageCollector.collect({
      body: {
        imageUrl: props.body.imageUrl,
        displayOrder: displayOrder,
      },
      shoppingMallProducts: { id: props.productId },
    }),
    ...ShoppingMallProductImageTransformer.select(),
  });
  // 4. Transform and return response
  return await ShoppingMallProductImageTransformer.transform(created);
}
