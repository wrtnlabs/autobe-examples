import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequest.ICreate;
    orderItem: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IShoppingMallCancellationRequest.ICreate;
//           shoppingMallOrderItems: IEntity; // from path parameter itemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       snapshots: ...,
//           } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------