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

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequests(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
      },
    });
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Only paid order items can request cancellation.",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUnique({
      where: { mall_platform_order_item_id: props.orderItemId },
      select: { id: true },
    });
  if (existing === null) {
    if (props.body.reason === undefined || props.body.status === undefined) {
      throw new HttpException(
        "Cancellation request reason and status are required when creating a request.",
        400,
      );
    }
    await MyGlobal.prisma.mall_platform_cancellation_requests.create({
      data: {
        id: v4(),
        mall_platform_order_item_id: props.orderItemId,
        reviewer_id: null,
        reason: props.body.reason,
        status: props.body.status,
        reviewed_at: null,
        review_result: props.body.reviewResult ?? null,
        reviewer_note: props.body.reviewerNote ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  } else {
    await MyGlobal.prisma.mall_platform_cancellation_requests.update({
      where: { mall_platform_order_item_id: props.orderItemId },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.reviewResult !== undefined && {
          review_result: props.body.reviewResult,
        }),
        ...(props.body.reviewerNote !== undefined && {
          reviewer_note: props.body.reviewerNote,
        }),
        updated_at: new Date(),
      },
    });
  }
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { mall_platform_order_item_id: props.orderItemId },
        ...MallPlatformCancellationRequestTransformer.select(),
      },
    );
  return await MallPlatformCancellationRequestTransformer.transform(
    cancellationRequest,
  );
}
