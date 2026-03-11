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

export async function postEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.ICreate;
}): Promise<IEcommerceMallWishlist> {
  // Validate customer is not banned
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  if (customer === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (customer.is_banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate product exists
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.body.product_id,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Check for duplicate wishlist entry
  const existing = await MyGlobal.prisma.ecommerce_mall_wishlists.findFirst({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      ecommerce_mall_product_id: props.body.product_id,
    },
  });
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Create wishlist entry
  const created = await MyGlobal.prisma.ecommerce_mall_wishlists.create({
    data: {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
    },
    ...EcommerceMallWishlistTransformer.select(),
  });
  return await EcommerceMallWishlistTransformer.transform(created);
}
