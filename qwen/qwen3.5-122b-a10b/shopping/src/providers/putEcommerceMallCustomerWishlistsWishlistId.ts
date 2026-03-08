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

export async function putEcommerceMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IEcommerceMallWishlist.IUpdate;
}): Promise<IEcommerceMallWishlist> {
  // Verify ownership
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: { id: true, ecommerce_mall_customer_id: true },
    });
  if (wishlist.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare update data with active/deleted_at synchronization
  const now = new Date();
  const updateData = {
    updated_at: now,
    ...(props.body.active !== undefined && {
      active: props.body.active,
      deleted_at: props.body.active ? null : now,
    }),
  } satisfies Prisma.ecommerce_mall_wishlistsUpdateInput;
  // Perform update
  await MyGlobal.prisma.ecommerce_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: updateData,
  });
  // Fetch updated record with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      ...EcommerceMallWishlistTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallWishlistTransformer.transform(updated);
}
