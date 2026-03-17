import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // Step 1: Fetch the snapshot, scoped to the parent cancellationRequestId
  // We need both the snapshot fields (for response) and auth traversal fields
  // Since the transformer select is flat (no joins), we do a two-step:
  // (a) fetch with auth join to verify ownership
  // (b) fetch with transformer select for response
  // OR we do a single findFirstOrThrow with all fields needed
  // Single query: get snapshot with auth join for ownership check
  const snapshotWithAuth =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          cancellation_request_id: props.cancellationRequestId,
        },
        select: {
          id: true,
          cancellation_request_id: true,
          status: true,
          reason: true,
          created_at: true,
          cancellationRequest: {
            select: {
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
  // Step 2: Authorization - verify the order belongs to the calling customer
  if (
    snapshotWithAuth.cancellationRequest.orderItem.order
      .shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Build and return the response DTO
  return await ShoppingMallCancellationRequestSnapshotTransformer.transform({
    id: snapshotWithAuth.id,
    cancellation_request_id: snapshotWithAuth.cancellation_request_id,
    status: snapshotWithAuth.status,
    reason: snapshotWithAuth.reason,
    created_at: snapshotWithAuth.created_at,
  });
}
