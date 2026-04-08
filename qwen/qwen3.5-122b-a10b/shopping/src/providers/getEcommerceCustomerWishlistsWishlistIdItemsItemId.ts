import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
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

export async function getEcommerceCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceWishlistItem> {
  // Verify the wishlist exists and belongs to the authenticated customer
  await MyGlobal.prisma.ecommerce_wishlists.findFirstOrThrow({
    where: {
      id: props.wishlistId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Find the wishlist item with nested relations
  const record =
    await MyGlobal.prisma.ecommerce_wishlist_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        ecommerce_wishlist_id: props.wishlistId,
        deleted_at: null,
      },
      ...EcommerceWishlistItemTransformer.select(),
    });
  return await EcommerceWishlistItemTransformer.transform(record);
}
