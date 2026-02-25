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
    const id: string = v4();
    const now = new Date();
    const year = now.getFullYear();
    // Query for next order number sequence
    const lastOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
      where: {
        order_number: {
          startsWith: `ORD-${year}-`,
        },
      },
      orderBy: {
        order_number: "desc",
      },
    });
    const lastNumber = lastOrder
      ? parseInt(lastOrder.order_number.split("-")[2], 10)
      : 0;
    const orderNumber = `ORD-${year}-${String(lastNumber + 1).padStart(6, "0")}`;
    return {
      id,
      order_number: orderNumber,
      total_price: 0,
      status: "paid",
      created_at: now,
      updated_at: now,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
      // Note: address relation requires shopping_mall_customer_addresses table
      // which is not yet available in the Prisma schema.
      // Address snapshot creation should be handled when customer addresses are implemented.
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
