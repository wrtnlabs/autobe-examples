import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderCollector {
  export async function collect(props: {
    body: IEcommerceMallOrder.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    const orderNumber: string = `ORD-${Date.now()}-${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`;
    return {
      id,
      order_number: orderNumber,
      total_price: 0,
      status: "pending",
      recipient_name: props.body.recipientName,
      recipient_phone: props.body.recipientPhone,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state: props.body.state ?? null,
      postal_code: props.body.postalCode,
      country: props.body.country,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}
