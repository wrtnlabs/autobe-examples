import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformWishlistItemCollector } from "../collectors/EcommercePlatformWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformWishlistItemTransformer } from "../transformers/EcommercePlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformWishlistItem.ICreate;
}): Promise<IEcommercePlatformWishlistItem> {
  // Validate product exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Check for existing non-deleted wishlist entry (unique constraint)
  const existing =
    await MyGlobal.prisma.ecommerce_platform_wishlist_items.findFirst({
      where: {
        ecommerce_platform_customer_id: props.customer.id,
        ecommerce_platform_product_id: props.body.product_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Product already exists in wishlist", 409);
  }
  // Create wishlist entry using Collector and Transformer
  const record = await MyGlobal.prisma.ecommerce_platform_wishlist_items.create(
    {
      data: await EcommercePlatformWishlistItemCollector.collect({
        body: props.body,
        ecommercePlatformCustomers: props.customer,
      }),
      ...EcommercePlatformWishlistItemTransformer.select(),
    },
  );
  return await EcommercePlatformWishlistItemTransformer.transform(record);
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
// import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerWishlist(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformWishlistItem.ICreate;
// }): Promise<IEcommercePlatformWishlistItem> {
//   const record = await MyGlobal.prisma.ecommerce_platform_wishlist_items.create({
//     data: await EcommercePlatformWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformWishlistItemTransformer.select(),
//   });
//   return await EcommercePlatformWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------