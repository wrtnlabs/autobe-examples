import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.shoppingMallOrders.id } },
      seller: { connect: { id: props.shoppingMallSellers.id } },
      orderItems: props.body.orderItemIds.length
        ? {
            connect: props.body.orderItemIds.map((orderItemId) => ({
              id: orderItemId,
            })),
          }
        : undefined,
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallShipmentCollector {
//         export async function collect(props: {
//           body: IShoppingMallShipment.ICreate;
//           shoppingMallOrders: IEntity; // from path parameter orderId
// shoppingMallSellers: IEntity; // from authorized actor
// shoppingMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier_name: ...,
//       tracking_number: ...,
//       delivered_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       order: ...,
//       seller: ...,
//       orderItems: ...,
//           } satisfies Prisma.shopping_mall_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------