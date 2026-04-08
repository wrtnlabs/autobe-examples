import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistTransformer } from "../transformers/MallPlatformWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlist.IUpdate;
}): Promise<IMallPlatformWishlist> {
  const productIds: string[] = [];
  const visited = new Set<string>();
  for (const item of props.body.products) {
    if (visited.has(item.product_id)) continue;
    visited.add(item.product_id);
    productIds.push(item.product_id);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const currentWishlist = await prisma.mall_platform_wishlists.findUnique({
      where: { customer_id: props.customer.id },
      select: { id: true, customer_id: true },
    });
    if (
      currentWishlist !== null &&
      currentWishlist.customer_id !== props.customer.id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const wishlist =
      currentWishlist ??
      (await prisma.mall_platform_wishlists.create({
        data: {
          id: v4(),
          customer: { connect: { id: props.customer.id } },
          deleted_at: null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        select: { id: true },
      }));
    const productRecords = await prisma.mall_platform_products.findMany({
      where: {
        id: { in: productIds },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (productRecords.length !== productIds.length) {
      throw new HttpException(
        "One or more products are invalid or deleted",
        400,
      );
    }
    await prisma.mall_platform_wishlist_items.deleteMany({
      where: { mall_platform_wishlist_id: wishlist.id },
    });
    if (productIds.length > 0) {
      await prisma.mall_platform_wishlist_items.createMany({
        data: productIds.map((productId) => ({
          id: v4(),
          mall_platform_wishlist_id: wishlist.id,
          mall_platform_product_id: productId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
      });
    }
    return await prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: { id: wishlist.id },
      ...MallPlatformWishlistTransformer.select(),
    });
  });
  return await MallPlatformWishlistTransformer.transform(updated);
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
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformCustomerWishlists(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformWishlist.IUpdate;
// }): Promise<IMallPlatformWishlist> {
//   await MyGlobal.prisma.mall_platform_wishlists.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformWishlistTransformer.select(),
//   });
//   return await MallPlatformWishlistTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------