import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCancellationRequestSnapshotsSnapshotId(props: {
  snapshotId: string;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUnique(
      {
        where: { id: props.snapshotId },
      },
    );
  if (!snapshot) {
    throw new HttpException("Cancellation request snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_cancellation_request_id:
      snapshot.shopping_mall_cancellation_request_id,
    customer_id: snapshot.customer_id,
    customer_session_id:
      snapshot.customer_session_id === null
        ? undefined
        : snapshot.customer_session_id,
    seller_id: snapshot.seller_id === null ? undefined : snapshot.seller_id,
    seller_session_id:
      snapshot.seller_session_id === null
        ? undefined
        : snapshot.seller_session_id,
    request_reason: snapshot.request_reason,
    response_reason:
      snapshot.response_reason === null ? undefined : snapshot.response_reason,
    status: snapshot.status,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
