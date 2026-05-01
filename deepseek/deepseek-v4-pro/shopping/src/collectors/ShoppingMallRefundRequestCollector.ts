import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallRefundRequestCollector {
  export async function collect(props: {
    body: IShoppingMallRefundRequest.ICreate;
    shoppingMallOrderItems: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallRefundRequestCollector {
//         export async function collect(props: {
//           body: IShoppingMallRefundRequest.ICreate;
//           shoppingMallOrderItems: IEntity; // from path parameter itemId
// shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       responded_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       snapshots: ...,
//           } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------