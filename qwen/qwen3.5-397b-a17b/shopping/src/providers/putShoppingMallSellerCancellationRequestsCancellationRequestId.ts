import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          shopping_mall_order_item_id: true,
          reason: true,
          shopping_mall_customer_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
              shopping_mall_product_variant_id: true,
              quantity: true,
            },
          },
        },
      },
    );
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been responded to",
      400,
    );
  }
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: props.cancellationRequestId,
      shopping_mall_seller_id: props.seller.id,
      status: props.body.status,
      reason: cancellationRequest.reason,
      response_reason: props.body.responseReason,
      created_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        product_variant_id:
          cancellationRequest.orderItem.shopping_mall_product_variant_id,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "cancellation",
        created_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
