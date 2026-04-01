import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true },
    });
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { id: true },
    });
  if (orderItem.id !== props.orderItemId) {
    throw new HttpException("Order item not found", 404);
  }
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
          reviewer_id: true,
          reason: true,
          status: true,
          reviewed_at: true,
          review_result: true,
          reviewer_note: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order item",
      400,
    );
  }
  if (cancellationRequest.deleted_at !== null) {
    throw new HttpException("Cancellation request is not available", 400);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request is already closed", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const now = new Date();
    const reviewCompleted =
      props.body.status !== undefined && props.body.status !== "pending";
    return await prisma.mall_platform_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.reviewResult !== undefined && {
          review_result: props.body.reviewResult,
        }),
        ...(props.body.reviewerNote !== undefined && {
          reviewer_note: props.body.reviewerNote,
        }),
        ...(reviewCompleted && {
          reviewer_id: administrator.id,
          reviewed_at: now,
        }),
        updated_at: now,
      },
      ...MallPlatformCancellationRequestTransformer.select(),
    });
  });
  return await MallPlatformCancellationRequestTransformer.transform(updated);
}
