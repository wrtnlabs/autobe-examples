import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
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

export async function getShoppingMallCustomerCancellationsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  // Fetch the cancellation request to verify ownership
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        id: props.cancellationRequestId,
        customer_id: props.customer.id,
      },
    });
  if (!request) {
    throw new HttpException(
      "Cancellation request not found or not authorized",
      404,
    );
  }
  // Extract pagination parameters (default to 1 and 100)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch snapshots ordered by changed_at ascending (oldest first)
  const snapshots =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: {
          cancellation_request_id: props.cancellationRequestId,
        },
        skip,
        take: limit,
        orderBy: {
          changed_at: "asc",
        },
      },
    );
  // Count total matching snapshots
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: {
        cancellation_request_id: props.cancellationRequestId,
      },
    });
  // Transform snapshot records into DTO format manually
  const data = snapshots.map((snapshot) => ({
    id: snapshot.id as string & tags.Format<"uuid">,
    reason: snapshot.reason,
    status: snapshot.status as "pending" | "approved" | "rejected",
    responder_id:
      snapshot.responder_id !== null
        ? (snapshot.responder_id as string & tags.Format<"uuid">)
        : null,
    response_reason: snapshot.response_reason,
    changed_at: snapshot.changed_at.toISOString() as string &
      tags.Format<"date-time">,
    changed_by: snapshot.changed_by as "customer" | "seller" | "admin",
    cancellation_request_id: snapshot.cancellation_request_id as string &
      tags.Format<"uuid">,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallCancellationRequestSnapshot.ISummary;
}
