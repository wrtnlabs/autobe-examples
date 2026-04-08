import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        shipping_recipient_name: true,
        shipping_phone: true,
        shipping_street_address: true,
        shipping_city: true,
        shipping_state: true,
        shipping_postal_code: true,
        shipping_country: true,
        total_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        orderItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_order_itemsFindManyArgs,
        shipments: {
          select: { id: true },
        } satisfies Prisma.ecommerce_shipmentsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      total_price: input.total_price,
      created_at: input.created_at.toISOString(),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IEcommerceOrder.ISummary;
  }
}
