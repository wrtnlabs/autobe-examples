import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestSnapshotCollector } from "../collectors/ShoppingMallRefundRequestSnapshotCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerRefundRequestsRefundRequestIdResponses(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            shopping_mall_seller_id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    });
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    refundRequest.status === "approved" ||
    refundRequest.status === "rejected" ||
    refundRequest.status === "refunded" ||
    refundRequest.status === "withdrawn"
  ) {
    throw new HttpException("Refund request is not in a reviewable state", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid refund response status", 400);
  }
  const reviewedAt = new Date().toISOString();
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_refund_requests.update({
      where: {
        id: props.refundRequestId,
      },
      data: {
        status: props.body.status,
        reviewer_role: "seller",
        review_note: props.body.review_note ?? null,
        reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      },
    });
    await prisma.shopping_mall_refund_request_snapshots.create({
      data: await ShoppingMallRefundRequestSnapshotCollector.collect({
        body: props.body,
        refundRequest: {
          id: props.refundRequestId,
        },
        reviewer: {
          id: props.seller.id,
        },
      }),
    });
    return await prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
