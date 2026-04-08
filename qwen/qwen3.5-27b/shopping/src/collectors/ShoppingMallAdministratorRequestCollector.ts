import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorRequestCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorRequest.ICreate;
    shoppingMallCustomers?: IEntity;
    shoppingMallSellers?: IEntity;
  }) {
    const id: string = v4();
    // Determine actor type based on which entity is provided
    const actorType: string = props.shoppingMallCustomers
      ? "customer"
      : "seller";
    return {
      id,
      actor_type: actorType,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      processedByAdministrator: undefined,
      customerLink: props.shoppingMallCustomers
        ? {
            connect: {
              id: props.shoppingMallCustomers.id,
            },
          }
        : undefined,
      sellerRequest: props.shoppingMallSellers
        ? {
            connect: {
              id: props.shoppingMallSellers.id,
            },
          }
        : undefined,
    } satisfies Prisma.shopping_mall_administrator_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallAdministratorRequestCollector {
//         export async function collect(props: {
//           body: IShoppingMallAdministratorRequest.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallSellers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       actor_type: ...,
//       reason: ...,
//       status: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       processedByAdministrator: ...,
//       customerLink: ...,
//       sellerRequest: ...,
//           } satisfies Prisma.shopping_mall_administrator_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------