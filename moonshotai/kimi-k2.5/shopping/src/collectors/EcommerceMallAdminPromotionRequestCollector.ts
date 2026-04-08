import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminPromotionRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminPromotionRequest.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      status: "pending" as const,
      reason: props.body.reason,
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reviewer: undefined,
      snapshots: undefined,
      customerSubtype: undefined,
      sellerRequest: undefined,
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallAdminPromotionRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallAdminPromotionRequest.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallCustomerSessions: IEntity; // from authorized session
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       reason: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       reviewer: ...,
//       snapshots: ...,
//       customerSubtype: ...,
//       sellerRequest: ...,
//           } satisfies Prisma.ecommerce_mall_admin_promotion_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------