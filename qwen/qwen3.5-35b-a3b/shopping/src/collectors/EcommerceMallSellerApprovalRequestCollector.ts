import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerApprovalRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerApprovalRequest.ICreate;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      request_reason: props.body.request_reason,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: { id: props.ecommerceMallSellers.id },
      },
      reviewer: undefined,
    } satisfies Prisma.ecommerce_mall_seller_approval_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallSellerApprovalRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallSellerApprovalRequest.ICreate;
//           ecommerceMallSellers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       request_reason: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       reviewer: ...,
//       snapshotHistories: ...,
//       snapshot: ...,
//           } satisfies Prisma.ecommerce_mall_seller_approval_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------