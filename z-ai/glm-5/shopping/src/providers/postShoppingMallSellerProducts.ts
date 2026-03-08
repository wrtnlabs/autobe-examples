import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Validate category exists and is not deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.body.categoryId,
      deleted_at: null,
    },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  // Check unique constraint: product name must be unique per seller
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingProduct !== null) {
    throw new HttpException("Product name already exists for this seller", 409);
  }
  // Create product using collector
  const createData = await ShoppingMallProductCollector.collect({
    body: props.body,
    shoppingMallSellers: { id: props.seller.id },
  });
  const product = await MyGlobal.prisma.shopping_mall_products.create({
    data: createData,
    ...ShoppingMallProductTransformer.select(),
  });
  return await ShoppingMallProductTransformer.transform(product);
}
