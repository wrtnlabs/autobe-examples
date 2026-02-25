import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerOrdersOrderIdCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId, deleted_at: null },
      include: { orderItem: true },
    });
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      `Cancellation request must be 'pending', got ${cancellationRequest.status}`,
      400,
    );
  }
  if (cancellationRequest.orderItem.order.id !== props.orderId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order",
      400,
    );
  }
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException(
      `Order item must be 'paid', got ${cancellationRequest.orderItem.status}`,
      400,
    );
  }
  const updatedCancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        updated_at: toISOStringSafe(new Date()),
      },
      include: { orderItem: true },
    });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: { status: "cancelled", updated_at: toISOStringSafe(new Date()) },
    });
    const orderItemWithVariant =
      await MyGlobal.prisma.ecommerce_order_items.findUnique({
        where: { id: cancellationRequest.orderItem.id },
        include: { variant: true },
      });
    if (orderItemWithVariant && orderItemWithVariant.variant) {
      await MyGlobal.prisma.ecommerce_variant_inventories.create({
        data: {
          id: v4(),
          variant: {
            connect: { id: orderItemWithVariant.variant.id },
          },
          quantity: orderItemWithVariant.quantity,
          reason: "cancelled_item",
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    await MyGlobal.prisma.ecommerce_order_snapshots.create({
      data: {
        order: {
          connect: { id: cancellationRequest.orderItem.order.id },
        },
        order_item_id: cancellationRequest.orderItem.id,
        status: "cancelled",
        actor: { id: props.seller.id },
        created_at: toISOStringSafe(new Date()),
      },
    });
  }
  return await EcommerceCancellationRequestTransformer.transform(
    updatedCancellationRequest,
  );
}
