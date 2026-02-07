import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IShoppingMallWishlist[]> {
  // Since IShoppingMallWishlist.IRequest is empty in the schema,
  // this endpoint likely returns all wishlist items for the authenticated customer
  // rather than performing updates (the PATCH method might be used for filtering/searching).
  const wishlists = await MyGlobal.prisma.shopping_mall_wishlists.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  // Map database records to response format with proper type conversions
  return wishlists.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    customer_id: record.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    product_id: record.shopping_mall_product_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
}
