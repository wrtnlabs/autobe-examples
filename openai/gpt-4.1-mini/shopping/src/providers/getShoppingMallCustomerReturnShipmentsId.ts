import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerReturnShipmentsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReturnShipment> {
  const { customer, id } = props;

  const shipment =
    await MyGlobal.prisma.shopping_mall_return_shipments.findUniqueOrThrow({
      where: { id },
      include: {
        refundRequest: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_customer_id: true,
            refund_amount: true,
            refund_reason: true,
            refund_status: true,
            created_at: true,
            updated_at: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            nickname: true,
            created_at: true,
          },
        },
      },
    });

  if (shipment.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: Access denied.", 403);
  }

  return {
    id: shipment.id,
    shopping_mall_refund_request_id: shipment.shopping_mall_refund_request_id,
    shopping_mall_customer_id: shipment.shopping_mall_customer_id,
    carrier_name: shipment.carrier_name,
    tracking_number: shipment.tracking_number,
    return_status: shipment.return_status,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: null,
    refundRequest: shipment.refundRequest
      ? {
          id: shipment.refundRequest.id,
          shopping_mall_order_id: shipment.refundRequest.shopping_mall_order_id,
          shopping_mall_customer_id:
            shipment.refundRequest.shopping_mall_customer_id,
          refund_amount: shipment.refundRequest.refund_amount,
          refund_reason: shipment.refundRequest.refund_reason ?? null,
          refund_status: shipment.refundRequest.refund_status,
          created_at: toISOStringSafe(shipment.refundRequest.created_at),
          updated_at: toISOStringSafe(shipment.refundRequest.updated_at),
        }
      : undefined,
    customer: shipment.customer
      ? {
          id: shipment.customer.id,
          email: shipment.customer.email,
          nickname: shipment.customer.nickname,
          created_at: toISOStringSafe(shipment.customer.created_at),
        }
      : undefined,
  };
}
