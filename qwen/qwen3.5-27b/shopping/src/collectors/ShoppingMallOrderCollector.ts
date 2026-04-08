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
  }) {
    const id: string = v4();
    return {
      id,
      order_number: `ORD-${Date.now()}-${id.slice(0, 8)}`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      shippingAddress: {
        connect: { id: props.body.shopping_mall_customer_address_id },
      },
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallOrderCollector {
//         export async function collect(props: {
//           body: IShoppingMallOrder.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       shippingAddress: ...,
//       items: ...,
//       shipments: ...,
//           } satisfies Prisma.shopping_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------