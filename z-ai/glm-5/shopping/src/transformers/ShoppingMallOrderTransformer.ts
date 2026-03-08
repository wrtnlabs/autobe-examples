import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        shipping_recipient_name: true,
        shipping_phone_number: true,
        shipping_street_address: true,
        shipping_city: true,
        shipping_state_province: true,
        shipping_postal_code: true,
        shipping_country: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      totalPrice: input.total_price,
      status: input.status,
      customer: input.customer
        ? await ShoppingMallCustomerAtSummaryTransformer.transform(
            input.customer,
          )
        : null,
      shippingRecipientName: input.shipping_recipient_name,
      shippingPhoneNumber: input.shipping_phone_number,
      shippingStreetAddress: input.shipping_street_address,
      shippingCity: input.shipping_city,
      shippingStateProvince: input.shipping_state_province,
      shippingPostalCode: input.shipping_postal_code,
      shippingCountry: input.shipping_country,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
