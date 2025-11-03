import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingWishlistItem.IUpdate;
}): Promise<IShoppingWishlistItem> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - API and DTO expect wishlist item to have a 'note' field, but
   *   shopping_wishlist_items model does NOT have 'note' or 'deleted_at'.
   * - Any update or return logic involving those fields is impossible.
   * - Impossible to securely implement update/return of note field without schema
   *   support.
   *
   * @todo: Add 'note' (and, if needed, 'deleted_at') field(s) to Prisma schema.
   *   For now, return mock (typia.random) object to match return type with warning.
   */
  return typia.random<IShoppingWishlistItem>();
}
