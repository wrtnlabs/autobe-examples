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
  cancellationRequestId: string;
  snapshotId: string;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // First, verify the cancellation request exists and customer owns it
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: { customer_id: true },
      },
    );
  // Authorization check - customer must own the cancellation request
  if (cancellationRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query snapshot - must belong to the verified cancellation request
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_cancellation_request_id: props.cancellationRequestId,
        },
        ...ShoppingMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
