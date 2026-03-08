import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistTransformer } from "../transformers/EcommerceMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.ICreate;
}): Promise<IEcommerceMallWishlist> {
  // Validate product exists and is active
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.body.ecommerce_mall_product_id },
    select: { id: true, status: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.status !== "active" || product.deleted_at !== null) {
    throw new HttpException("Product is not available", 400);
  }
  // Create wishlist entry
  try {
    const wishlist = await MyGlobal.prisma.ecommerce_mall_wishlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        active: true,
        customer: { connect: { id: props.customer.id } },
        product: { connect: { id: props.body.ecommerce_mall_product_id } },
      } satisfies Prisma.ecommerce_mall_wishlistsCreateInput,
      ...EcommerceMallWishlistTransformer.select(),
    });
    return await EcommerceMallWishlistTransformer.transform(wishlist);
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
