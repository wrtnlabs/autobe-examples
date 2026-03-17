import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const target =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        decision_note: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    });
  if (target.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.status === undefined &&
    props.body.decision_note === undefined
  ) {
    throw new HttpException("No mutable fields provided", 400);
  }
  if (target.status !== "pending") {
    throw new HttpException("Cancellation request is already finalized", 400);
  }
  if (props.body.status === undefined) {
    throw new HttpException("Status is required for seller review", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException(
      "Invalid cancellation request status transition",
      400,
    );
  }
  if (
    props.body.decision_note !== undefined &&
    props.body.decision_note === target.decision_note
  ) {
    throw new HttpException("No changes detected", 400);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.seller.id,
    },
    select: {
      email: true,
    },
  });
  const reviewedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const reviewedAtValue = new Date(reviewedAt);
  const nextDecisionNote: string | null =
    props.body.decision_note === undefined
      ? target.decision_note
      : props.body.decision_note;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        status: props.body.status,
        decision_note: nextDecisionNote,
        reviewed_by_type: "seller",
        reviewed_at: reviewedAtValue,
        updated_at: reviewedAtValue,
      },
    });
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: {
          connect: {
            id: props.cancellationRequestId,
          },
        },
        reviewer_display_name: seller.email,
        created_at: reviewedAtValue,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
