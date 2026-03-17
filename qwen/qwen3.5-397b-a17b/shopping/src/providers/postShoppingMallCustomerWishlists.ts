import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallWishlistCollector } from "../collectors/ShoppingMallWishlistCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistTransformer } from "../transformers/ShoppingMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.body.product_id, deleted: false },
  });
  try {
    const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
      data: await ShoppingMallWishlistCollector.collect({
        body: props.body,
        shoppingMallCustomers: { id: props.customer.id },
      }),
      ...ShoppingMallWishlistTransformer.select(),
    });
    return await ShoppingMallWishlistTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Product already in wishlist", 409);
    }
    throw error;
  }
}
