import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
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

export async function getShoppingMallCustomerWishlistSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItemSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_wishlist_item_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          snapshot_data: true,
          created_at: true,
          wishlistItem: {
            select: {
              id: true,
              shopping_mall_customer_id: true,
              created_at: true,
            },
          },
        },
      },
    );
  if (snapshot.wishlistItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    wishlistItem: {
      id: snapshot.wishlistItem.id,
      created_at: snapshot.wishlistItem.created_at.toISOString(),
    },
    snapshotData: snapshot.snapshot_data,
    createdAt: snapshot.created_at.toISOString(),
  };
}
