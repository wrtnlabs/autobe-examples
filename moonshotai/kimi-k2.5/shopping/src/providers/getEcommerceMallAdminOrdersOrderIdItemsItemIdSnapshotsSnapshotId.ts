import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { EcommerceMallOrderItemVariantSnapshotTransformer } from "../transformers/EcommerceMallOrderItemVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsItemIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemSnapshot> {
  // Query the snapshot with complete relations including order item for hierarchy check
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          order_item_id: true,
          created_at: true,
          orderItem: {
            select: {
              id: true,
              order_id: true,
            },
          },
          productSnapshot:
            EcommerceMallOrderItemProductSnapshotTransformer.select(),
          variantSnapshot:
            EcommerceMallOrderItemVariantSnapshotTransformer.select(),
          sellerSnapshot:
            EcommerceMallOrderItemSellerSnapshotTransformer.select(),
        },
      },
    );
  // Verify the snapshot belongs to the specified order item
  if (snapshot.order_item_id !== props.itemId) {
    throw new HttpException(
      "Snapshot does not belong to the specified order item",
      403,
    );
  }
  // Verify the order item belongs to the specified order
  if (snapshot.orderItem.order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      403,
    );
  }
  // Transform nested snapshots
  const productSnapshot =
    await EcommerceMallOrderItemProductSnapshotTransformer.transform(
      snapshot.productSnapshot,
    );
  const variantSnapshot =
    await EcommerceMallOrderItemVariantSnapshotTransformer.transform(
      snapshot.variantSnapshot,
    );
  const sellerSnapshot =
    await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
      snapshot.sellerSnapshot,
    );
  // Build and return the response
  return {
    id: snapshot.id,
    orderItemId: snapshot.order_item_id,
    productSnapshot,
    variantSnapshot,
    sellerSnapshot,
    createdAt: snapshot.created_at.toISOString(),
  };
}
