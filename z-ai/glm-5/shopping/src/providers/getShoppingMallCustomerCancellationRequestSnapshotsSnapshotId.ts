import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
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

export async function getShoppingMallCustomerCancellationRequestSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // Query snapshot with all needed relations for authorization and response
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          reason: true,
          status: true,
          created_at: true,
          cancellationRequest: {
            select: {
              id: true,
              shopping_mall_order_item_id: true,
              reason: true,
              status: true,
              created_at: true,
              responded_at: true,
              orderItem: {
                select: {
                  order: {
                    select: {
                      order_number: true,
                      shopping_mall_customer_id: true,
                    },
                  },
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  // Authorization check: verify customer owns the order
  if (
    snapshot.cancellationRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to response format
  return {
    id: snapshot.id,
    reason: snapshot.reason,
    status: snapshot.status,
    created_at: snapshot.created_at.toISOString(),
    cancellation_request: {
      id: snapshot.cancellationRequest.id,
      orderItemId: snapshot.cancellationRequest.shopping_mall_order_item_id,
      productName: snapshot.cancellationRequest.orderItem.product.name,
      orderNumber: snapshot.cancellationRequest.orderItem.order.order_number,
      reason: snapshot.cancellationRequest.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(
        snapshot.cancellationRequest.status,
      ),
      createdAt: snapshot.cancellationRequest.created_at.toISOString(),
      respondedAt:
        snapshot.cancellationRequest.responded_at?.toISOString() ?? null,
    } satisfies IShoppingMallCancellationRequest.ISummary,
  };
}
