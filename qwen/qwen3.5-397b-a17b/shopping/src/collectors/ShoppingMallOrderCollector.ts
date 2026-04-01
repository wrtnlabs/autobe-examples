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
    session: IEntity;
  }) {
    // Query address to snapshot all fields at order time
    const address =
      await MyGlobal.prisma.shopping_mall_addresses.findFirstOrThrow({
        where: { id: props.body.shopping_mall_address_id },
      });
    const id: string = v4();
    const order_number: string = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      // Scalar fields
      id,
      order_number,
      ordered_at: new Date(),
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      street_address: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.customer.id } },
      // HasMany relations - not created here (order items created separately)
      // orderItems: omitted
      // reviews: omitted
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
