import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsItemIdSellerSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          shop_name: true,
          logo_url: true,
          created_at: true,
          orderItem: {
            select: {
              id: true,
              order_id: true,
            },
          },
        } satisfies Prisma.ecommerce_mall_order_item_seller_snapshotsFindUniqueOrThrowArgs["select"],
      },
    );
  if (snapshot.orderItem.id !== props.itemId) {
    throw new HttpException(
      "Snapshot does not belong to the specified order item",
      404,
    );
  }
  if (snapshot.orderItem.order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  return {
    id: snapshot.id,
    shopName: snapshot.shop_name,
    logoUrl: snapshot.logo_url ?? null,
    createdAt: snapshot.created_at.toISOString(),
  };
}
