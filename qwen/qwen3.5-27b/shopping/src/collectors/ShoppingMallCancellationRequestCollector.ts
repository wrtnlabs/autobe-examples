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
    shoppingMallCustomers: IEntity;
    shoppingMallOrderItems: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      status: "pending",
      reason: props.body.reason,
      response_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
      // HasMany relations (reverse relations, not created here)
      requestSnapshots: undefined,
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IShoppingMallCancellationRequest.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallOrderItems: IEntity; // from path parameter itemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       reason: ...,
//       response_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       orderItem: ...,
//       requestSnapshots: ...,
//       snapshots: ...,
//           } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------