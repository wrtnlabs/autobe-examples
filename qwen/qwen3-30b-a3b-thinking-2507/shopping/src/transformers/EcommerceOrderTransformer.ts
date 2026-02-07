import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCancellationRequestAtSummaryTransformer } from "./EcommerceCancellationRequestAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderItemTransformer } from "./EcommerceOrderItemTransformer";
import { EcommerceRefundRequestAtSummaryTransformer } from "./EcommerceRefundRequestAtSummaryTransformer";
import { EcommerceShipmentAtSummaryTransformer } from "./EcommerceShipmentAtSummaryTransformer";

export namespace EcommerceOrderTransformer {
  export type Payload = Prisma.ecommerce_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_date: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        ecommerce_order_items: EcommerceOrderItemTransformer.select(),
        ecommerce_shipments: EcommerceShipmentAtSummaryTransformer.select(),
        ecommerce_cancellation_requests:
          EcommerceCancellationRequestAtSummaryTransformer.select(),
        ecommerce_refund_requests:
          EcommerceRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceOrder> {
    return {
      id: input.id,
      order_date: toISOStringSafe(input.order_date),
      status: typia.assert<
        "pending" | "processing" | "shipped" | "delivered" | "cancelled"
      >(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      items: await ArrayUtil.asyncMap(
        input.ecommerce_order_items,
        EcommerceOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.ecommerce_shipments,
        EcommerceShipmentAtSummaryTransformer.transform,
      ),
      cancellationRequests: await ArrayUtil.asyncMap(
        input.ecommerce_cancellation_requests,
        EcommerceCancellationRequestAtSummaryTransformer.transform,
      ),
      refundRequests: await ArrayUtil.asyncMap(
        input.ecommerce_refund_requests,
        EcommerceRefundRequestAtSummaryTransformer.transform,
      ),
    };
  }
}
