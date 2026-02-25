import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallOrderItemCollector } from "./ShoppingMallOrderItemCollector";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    const order_number: string = v4();
    // Calculate total_quantity and total_price if possible
    const total_quantity: number = props.body.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    // total_price calculation placeholder: set to 0, can be extended by actual price calculation externally
    const total_price: number = 0;
    return {
      id,
      order_number,
      total_price,
      total_quantity,
      order_status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      orderItemSnapshots: undefined,
      orderItems: props.body.orderItems.length
        ? {
            create: await Promise.all(
              props.body.orderItems.map((item) =>
                ShoppingMallOrderItemCollector.collect({ body: item }),
              ),
            ),
          }
        : undefined,
      orderSnapshots: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
