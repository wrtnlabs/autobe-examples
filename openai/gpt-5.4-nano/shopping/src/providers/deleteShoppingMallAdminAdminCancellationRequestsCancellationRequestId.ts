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
  // Fail fast if cancellationRequestId is not a valid UUID.
  // This uses typia runtime assertion and does not use native Date or `as`.
  typia.assert<string & tags.Format<"uuid">>(props.cancellationRequestId);
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: { id: true },
    });
    if (existing === null) {
      // Idempotent admin tooling: treat already-missing (including soft-deleted) as success.
      return;
    }
    await tx.shopping_mall_cancellation_requests.delete({
      where: { id: props.cancellationRequestId },
    });
  });
}
