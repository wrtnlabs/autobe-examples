import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fail fast if UUID is malformed (even though branded type should already be validated by DTO layer)
  typia.assert<string & tags.Format<"uuid">>(props.cancellationRequestId);
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: { id: true, deleted_at: true },
    });
    if (existing === null) {
      throw new HttpException("Not Found", 404);
    }
    // Idempotent behavior for admin tooling: if already soft-deleted, succeed without side effects.
    if (existing.deleted_at !== null) {
      return;
    }
    await tx.shopping_mall_cancellation_requests.delete({
      where: { id: props.cancellationRequestId },
    });
  });
}
