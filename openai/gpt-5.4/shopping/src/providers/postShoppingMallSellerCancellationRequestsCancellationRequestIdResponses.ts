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

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdResponses(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IResponse;
}): Promise<IShoppingMallCancellationRequest> {
  const allowedStatuses = new Set<string>(["approved", "rejected"]);
  if (allowedStatuses.has(props.body.status) === false) {
    throw new HttpException("Invalid cancellation response status", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const cancellationRequest =
      await prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
        where: {
          id: props.cancellationRequestId,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          reviewed_by_type: true,
          reviewed_at: true,
          decision_note: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          shopping_mall_order_item_id: true,
          shopping_mall_customer_id: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
              status: true,
            },
          } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        },
      });
    if (cancellationRequest.deleted_at !== null) {
      throw new HttpException("Cancellation request not found", 404);
    }
    if (
      cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    if (
      cancellationRequest.status === "approved" ||
      cancellationRequest.status === "rejected"
    ) {
      throw new HttpException("Cancellation request is already finalized", 400);
    }
    const eventAt = toISOStringSafe(new Date());
    await prisma.shopping_mall_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        status: props.body.status,
        reviewed_by_type: "seller",
        reviewed_at: new Date(eventAt),
        decision_note: props.body.decisionNote ?? null,
        updated_at: new Date(eventAt),
      },
    });
    await prisma.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: {
          connect: {
            id: props.cancellationRequestId,
          },
        },
        reviewer_display_name: `seller:${props.seller.id}`,
        created_at: new Date(eventAt),
      },
    });
    const updated =
      await prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
        where: {
          id: props.cancellationRequestId,
        },
        ...ShoppingMallCancellationRequestTransformer.select(),
      });
    return await ShoppingMallCancellationRequestTransformer.transform(updated);
  });
}
