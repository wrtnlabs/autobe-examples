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

export async function deleteShoppingMallAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
    where: {
      id: props.cancellationRequestId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
    where: {
      id: props.cancellationRequestId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
