import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    // Query address to get shipping information
    const address =
      await MyGlobal.prisma.shopping_mall_addresses.findFirstOrThrow({
        where: {
          id: props.body.addressId,
          shopping_mall_customer_id: props.shoppingMallCustomers.id,
          deleted_at: null,
        },
      });
    return {
      id: v4(),
      order_number: v4(),
      total_price: 0,
      status: "paid",
      shipping_recipient_name: address.recipient_name,
      shipping_phone_number: address.phone_number,
      shipping_street_address: address.street_address,
      shipping_city: address.city,
      shipping_state_province: address.state_province,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: props.shoppingMallCustomers
        ? { connect: { id: props.shoppingMallCustomers.id } }
        : undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
