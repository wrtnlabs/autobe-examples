import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderRefundRequestTransformer } from "../transformers/ShoppingMallOrderRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRequestIdRejection(props: {
  seller: SellerPayload;
  requestId: string;
  body: IShoppingMallOrderRefundRequest.IRejection;
}): Promise<IShoppingMallOrderRefundRequest> {
  // Validate refund request exists and belongs to seller
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          shopping_mall_seller_id: props.seller.id,
        },
      },
    );
  // Validate refund request status is pending (not already approved/rejected)
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      `Refund request is already ${refundRequest.status}`,
      409,
    );
  }
  // Validate rejection_reason is provided and not empty
  if (
    !props.body.rejection_reason ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException(
      "Rejection reason must be provided and not empty",
      422,
    );
  }
  // Update refund request status to rejected and set rejection_reason
  const updatedRefundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected",
        rejection_reason: props.body.rejection_reason,
      },
    });
  // Create refund request status log entry with 'rejected' status
  await MyGlobal.prisma.shopping_mall_order_refund_request_logs.create({
    data: {
      id: v4(),
      shopping_mall_order_refund_request_id: props.requestId,
      seller_id: props.seller.id,
      new_status: "rejected",
      old_status: "pending",
      rejection_reason: props.body.rejection_reason,
      changed_at: new Date(),
    },
  });
  // Retrieve updated refund request with nested relations for response
  const refundRequestWithRelations =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallOrderRefundRequestTransformer.select(),
      },
    );
  return await ShoppingMallOrderRefundRequestTransformer.transform(
    refundRequestWithRelations,
  );
}
