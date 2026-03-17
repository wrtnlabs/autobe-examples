import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  // Phase 1: Authorization check
  // Fetch the snapshot with auth chain: snapshot -> refundRequest -> orderItem -> order
  const authRecord =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findFirstOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          shopping_mall_refund_request_id: true,
          refundRequest: {
            select: {
              id: true,
              orderItem: {
                select: {
                  order: {
                    select: {
                      shopping_mall_customer_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  // Verify the snapshot belongs to the specified refund request (anti-enumeration)
  if (authRecord.shopping_mall_refund_request_id !== props.refundRequestId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the customer owns this order
  if (
    authRecord.refundRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Phase 2: Fetch full response using transformer
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    );
  return ShoppingMallRefundRequestSnapshotTransformer.transform(snapshot);
}
