import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallWishlistEntryCollector } from "../collectors/ShoppingMallWishlistEntryCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistEntryTransformer } from "../transformers/ShoppingMallWishlistEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerWishlistEntries(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistEntry.ICreate;
}): Promise<IShoppingMallWishlistEntry> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.body.shopping_mall_product_id,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null || product.status !== "active") {
    throw new HttpException("Product is not eligible for wishlist saving", 404);
  }
  try {
    return await MyGlobal.prisma.$transaction(async (tx) => {
      const existing = await tx.shopping_mall_wishlist_entries.findFirst({
        where: {
          shopping_mall_customer_id: props.customer.id,
          shopping_mall_product_id: props.body.shopping_mall_product_id,
        },
        select: {
          id: true,
          deleted_at: true,
        },
      });
      if (existing !== null && existing.deleted_at === null) {
        throw new HttpException("Product is already saved in wishlist", 409);
      }
      if (existing !== null && existing.deleted_at !== null) {
        const restored = await tx.shopping_mall_wishlist_entries.update({
          where: {
            id: existing.id,
          },
          data: {
            updated_at: new Date(new Date().toISOString()),
            deleted_at: null,
          },
          ...ShoppingMallWishlistEntryTransformer.select(),
        });
        return await ShoppingMallWishlistEntryTransformer.transform(restored);
      }
      const created = await tx.shopping_mall_wishlist_entries.create({
        data: await ShoppingMallWishlistEntryCollector.collect({
          body: props.body,
          shoppingMallCustomers: {
            id: props.customer.id,
          },
        }),
        ...ShoppingMallWishlistEntryTransformer.select(),
      });
      return await ShoppingMallWishlistEntryTransformer.transform(created);
    });
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Product is already saved in wishlist", 409);
    }
    throw error;
  }
}
