import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderItemTransformer } from "./EcommerceOrderItemTransformer";
import { EcommerceShipmentTransformer } from "./EcommerceShipmentTransformer";

export namespace EcommerceOrderTransformer {
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
        orderItems: EcommerceOrderItemTransformer.select(),
        shipments: EcommerceShipmentTransformer.select(),
      },
    } satisfies Prisma.ecommerce_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceOrder> {
    return {
      id: input.id,
      order_number: input.order_number,
      shipping_recipient_name: input.shipping_recipient_name,
      shipping_phone: input.shipping_phone,
      shipping_street_address: input.shipping_street_address,
      shipping_city: input.shipping_city,
      shipping_state: input.shipping_state,
      shipping_postal_code: input.shipping_postal_code,
      shipping_country: input.shipping_country,
      total_price: input.total_price,
      status: input.status,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceShipmentTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceOrder;
  }
}
