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

export async function deleteMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  void props.administrator;
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request is not deletable", 409);
  }
  await MyGlobal.prisma.mall_platform_cancellation_requests.delete({
    where: {
      id: cancellationRequest.id,
    },
  });
}
