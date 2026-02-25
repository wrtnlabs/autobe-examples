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

export async function postShoppingMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerWishlist.ICreate;
}): Promise<IShoppingMallCustomerWishlist> {
  const created = await MyGlobal.prisma.shopping_mall_customer_wishlists.create(
    {
      data: await ShoppingMallCustomerWishlistCollector.collect({
        body: props.body,
        shoppingMallCustomers: props.customer,
      }),
      ...ShoppingMallCustomerWishlistTransformer.select(),
    },
  );
  return await ShoppingMallCustomerWishlistTransformer.transform(created);
}
