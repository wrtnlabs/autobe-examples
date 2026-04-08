import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
  // Verify product exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Check if wishlist entry already exists for this customer-product pair
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_wishlists.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.productId,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Create wishlist entry using collector and transformer
  const record = await MyGlobal.prisma.shopping_mall_customer_wishlists.create({
    data: await ShoppingMallCustomerWishlistCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
    }),
    ...ShoppingMallCustomerWishlistTransformer.select(),
  });
  return await ShoppingMallCustomerWishlistTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerWishlists(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerWishlist.ICreate;
// }): Promise<IShoppingMallCustomerWishlist> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_wishlists.create({
//     data: await ShoppingMallCustomerWishlistCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCustomerWishlistTransformer.select(),
//   });
//   return await ShoppingMallCustomerWishlistTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------