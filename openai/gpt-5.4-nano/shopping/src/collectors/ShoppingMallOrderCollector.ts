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
    customer: IEntity;
  }) {
    const id: string = v4();
    const order_code: string = `ord_${id.replace(/-/g, "").slice(0, 10)}`;
    return {
      id,
      order_code,
      ship_to_name: props.body.ship_to_name,
      ship_to_phone: props.body.ship_to_phone,
      ship_to_postal_code: props.body.ship_to_postal_code,
      ship_to_region: props.body.ship_to_region,
      ship_to_city: props.body.ship_to_city,
      ship_to_street_address: props.body.ship_to_street_address,
      ship_to_detail_address: props.body.ship_to_detail_address,
      shipping_instructions: props.body.shipping_instructions ?? null,
      placed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      payment: { connect: { id: props.body.shopping_mall_payment_id } },
      orderItems: undefined,
      shipments: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
