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
import { EcommerceMallSnapshotTransformer } from "../transformers/EcommerceMallSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshot> {
  // Step 1: Fetch the order item with order relationship
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      include: {
        order: {
          select: { customer_id: true },
        },
      },
    });
  // Step 2: Verify the order item belongs to the specified order
  if (orderItem.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Step 3: Check authorization based on actor type
  const actorId = props.customer.id;
  if (props.customer.type === "customer") {
    // Customer can only view snapshots for orders they own
    if (orderItem.order.customer_id !== actorId) {
      throw new HttpException(
        "Forbidden: You do not have access to this order",
        403,
      );
    }
  } else if (props.customer.type === "seller") {
    // Seller can only view snapshots for their own products
    if (orderItem.seller_snapshot_id !== actorId) {
      throw new HttpException(
        "Forbidden: You do not have access to this product",
        403,
      );
    }
  } else if (props.customer.type === "admin") {
    // Admin has full access for oversight purposes
  } else if (props.customer.type === "superAdmin") {
    // SuperAdmin has full access for platform oversight
  } else {
    throw new HttpException("Forbidden: Invalid actor type", 403);
  }
  // Step 4: Fetch the snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallSnapshotTransformer.select(),
    });
  // Step 5: Transform and return
  return await EcommerceMallSnapshotTransformer.transform(snapshot);
}
