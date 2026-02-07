import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCartsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
}): Promise<IShoppingMallCartItem> {
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.cartItemId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Cart item not found", 404);
  }
  return {
    id: item.id as string & tags.Format<"uuid">,
    shoppingMallProductVariantId:
      item.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
    customerId: item.customer_id as string & tags.Format<"uuid">,
    quantity: item.quantity,
    snapshotProductName: item.snapshot_product_name,
    snapshotProductDescription: item.snapshot_product_description,
    snapshotVariantOptions: item.snapshot_variant_options,
    snapshotVariantPrice: item.snapshot_variant_price,
    snapshotSellerShopName: item.snapshot_seller_shop_name,
    snapshotSellerLogo: item.snapshot_seller_logo,
    createdAt: toISOStringSafe(item.created_at),
    updatedAt: toISOStringSafe(item.updated_at),
    deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  };
}
