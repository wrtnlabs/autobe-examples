import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshot> {
  // Verify order exists and customer owns it
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch order item and verify it belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        ecommerce_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        product_snapshot_id: true,
        variant_snapshot_id: true,
        seller_snapshot_id: true,
      },
    });
  // Fetch snapshot and verify it references this order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        entity_id: true,
        entity_type: true,
        snapshot_data: true,
        version: true,
        created_at: true,
        updated_at: true,
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            deleted_at: true,
          },
        },
        entity: true,
      },
    });
  // Verify snapshot is related to this order item
  const isProductSnapshot =
    snapshot.entity_id === orderItem.product_snapshot_id;
  const isVariantSnapshot =
    snapshot.entity_id === orderItem.variant_snapshot_id;
  const isSellerSnapshot = snapshot.entity_id === orderItem.seller_snapshot_id;
  if (!isProductSnapshot && !isVariantSnapshot && !isSellerSnapshot) {
    throw new HttpException("Snapshot not related to order item", 404);
  }
  return {
    id: snapshot.id,
    entity_id: snapshot.entity_id,
    entity_type: snapshot.entity_type,
    snapshot_data: snapshot.snapshot_data,
    version: snapshot.version,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    actor_id: snapshot.actor?.id ?? null,
    actor: snapshot.actor as IEcommerceMallSnapshot["actor"],
    entity: snapshot.entity as unknown as IEcommerceMallSnapshot["entity"],
  };
}
