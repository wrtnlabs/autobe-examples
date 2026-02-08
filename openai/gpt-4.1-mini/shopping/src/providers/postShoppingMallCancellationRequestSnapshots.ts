import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestSnapshotCollector } from "../collectors/ShoppingMallCancellationRequestSnapshotCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCancellationRequestSnapshots(props: {
  body: IShoppingMallCancellationRequestSnapshot.ICreate;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // Extract cancellation_request_id, reason, status from props.body using type assertion
  const { cancellation_request_id, reason, status } = props.body as any;
  // Validate cancellation_request_id exists
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: cancellation_request_id },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Collect data for snapshot creation
  const data = await ShoppingMallCancellationRequestSnapshotCollector.collect({
    reason,
    status,
    cancellationRequest,
    body: props.body,
  });
  // Create snapshot record
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
      data,
    });
  // Compose response with correct date string tags
  return {
    id: created.id,
    cancellation_request_id: created.cancellation_request_id,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
