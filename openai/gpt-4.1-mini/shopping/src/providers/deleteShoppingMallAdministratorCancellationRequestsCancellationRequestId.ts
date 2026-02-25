import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorCancellationRequestsCancellationRequestId(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Check existence - throws if not found
    await tx.shopping_mall_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
    });
    // Delete the cancellation request
    await tx.shopping_mall_cancellation_requests.delete({
      where: { id: props.cancellationRequestId },
    });
  });
}
