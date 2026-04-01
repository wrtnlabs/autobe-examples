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

export async function putMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const target =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
        deleted_at: null,
      },
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
        orderItem: {
          select: {
            id: true,
            mall_platform_seller_id: true,
            status: true,
            shipmentItem: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (target.orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (target.status !== "pending") {
    throw new HttpException("Cancellation request is already closed", 400);
  }
  if (target.orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation request is not eligible for review",
      400,
    );
  }
  if (target.orderItem.shipmentItem !== null) {
    throw new HttpException(
      "Cancellation request is not eligible for review",
      400,
    );
  }
  await MyGlobal.prisma.mall_platform_cancellation_requests.update({
    where: {
      id: target.id,
    },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.reviewResult !== undefined && {
        review_result: props.body.reviewResult,
      }),
      ...(props.body.reviewerNote !== undefined && {
        reviewer_note: props.body.reviewerNote,
      }),
      reviewer_id: props.seller.id,
      reviewed_at:
        props.body.status === undefined || props.body.status === "pending"
          ? target.reviewed_at
          : new Date(),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: target.id,
        },
        ...MallPlatformCancellationRequestTransformer.select(),
      },
    );
  return await MallPlatformCancellationRequestTransformer.transform(updated);
}
