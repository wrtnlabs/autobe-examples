import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallRefundRequestSnapshotsSnapshotId(props: {
  snapshotId: string;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!snapshot) {
    throw new HttpException("Refund request snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_refund_request_id: snapshot.shopping_mall_refund_request_id,
    customer_name: snapshot.customer_name,
    customer_email: snapshot.customer_email,
    customer_phone: snapshot.customer_phone,
    seller_name: snapshot.seller_name,
    seller_shop_name: snapshot.seller_shop_name,
    order_item_title: snapshot.order_item_title,
    requested_amount: snapshot.requested_amount,
    customer_reason: snapshot.customer_reason,
    customer_preferred_refund: snapshot.customer_preferred_refund,
    seller_decision: snapshot.seller_decision,
    seller_reason: snapshot.seller_reason,
    processing_fee: snapshot.processing_fee,
    actual_refund_amount: snapshot.actual_refund_amount,
    request_timestamp: snapshot.request_timestamp,
    response_timestamp: snapshot.response_timestamp,
    created_by: snapshot.created_by,
    state_snapshot: snapshot.state_snapshot,
  };
}
