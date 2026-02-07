import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistItemTransformer } from "../transformers/EcommerceWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IEcommerceWishlistItem.IUpdate;
}): Promise<IEcommerceWishlistItem> {
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      ...EcommerceWishlistItemTransformer.select(),
    });
  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }
  if (wishlistItem.customer.id !== props.customer.id) {
    throw new HttpException("You do not own this wishlist item", 403);
  }
  const updatedTimestamp = toISOStringSafe(new Date());
  const updatedItem = await MyGlobal.prisma.ecommerce_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: {
      updated_at: updatedTimestamp,
    },
    ...EcommerceWishlistItemTransformer.select(),
  });
  return await EcommerceWishlistItemTransformer.transform(updatedItem);
}
