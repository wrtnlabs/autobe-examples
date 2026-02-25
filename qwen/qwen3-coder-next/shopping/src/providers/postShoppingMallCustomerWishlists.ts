import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerWishlistCollector } from "../collectors/ShoppingMallCustomerWishlistCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerWishlistTransformer } from "../transformers/ShoppingMallCustomerWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerWishlist.ICreate;
}): Promise<IShoppingMallCustomerWishlist> {
  // Validate product exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_product_id },
      select: { id: true, is_deleted: true, deleted_at: true },
    });
  if (product.is_deleted || product.deleted_at !== null) {
    throw new HttpException("Product is not available", 400);
  }
  // Create wishlist item using collector
  const wishlist =
    await MyGlobal.prisma.shopping_mall_customer_wishlists.create({
      data: await ShoppingMallCustomerWishlistCollector.collect({
        body: props.body,
        shoppingMallCustomers: { id: props.customer.id } as any,
      }),
      ...ShoppingMallCustomerWishlistTransformer.select(),
    });
  return await ShoppingMallCustomerWishlistTransformer.transform(wishlist);
}
