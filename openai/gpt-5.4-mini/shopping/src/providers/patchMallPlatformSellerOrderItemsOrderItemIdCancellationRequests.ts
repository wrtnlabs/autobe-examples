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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdCancellationRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        mall_platform_seller_id: true,
      },
    });
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation request is only available for paid, unshipped order items",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUnique({
      where: { mall_platform_order_item_id: props.orderItemId },
      select: { id: true },
    });
  if (existing === null) {
    await MyGlobal.prisma.mall_platform_cancellation_requests.create({
      data: {
        id: v4(),
        mall_platform_order_item_id: props.orderItemId,
        reason: props.body.reason ?? "",
        status: props.body.status ?? "pending",
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
  const request =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { mall_platform_order_item_id: props.orderItemId },
        ...MallPlatformCancellationRequestTransformer.select(),
      },
    );
  return await MallPlatformCancellationRequestTransformer.transform(request);
}
