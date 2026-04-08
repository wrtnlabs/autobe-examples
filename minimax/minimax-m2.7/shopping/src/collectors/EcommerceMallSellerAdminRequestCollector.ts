import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerAdminRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerAdminRequest.ICreate;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      seller: { connect: { id: props.ecommerceMallSellers.id } },
    } satisfies Prisma.ecommerce_mall_seller_admin_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallSellerAdminRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallSellerAdminRequest.ICreate;
//           ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       reviewedBySuperAdmin: ...,
//           } satisfies Prisma.ecommerce_mall_seller_admin_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------