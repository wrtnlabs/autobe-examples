import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdministratorApprovalRequestsCollector {
  export async function collect(props: {
    body: IEcommerceMallAdministratorApprovalRequests.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      requestingMember: props.body.requestingMemberId
        ? { connect: { id: props.body.requestingMemberId } }
        : undefined,
      requestingSeller: props.body.requestingSellerId
        ? { connect: { id: props.body.requestingSellerId } }
        : undefined,
      reviewingSuperAdmin: undefined,
      createdAdmin: undefined,
    } satisfies Prisma.ecommerce_mall_administrator_approval_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallAdministratorApprovalRequestsCollector {
//         export async function collect(props: {
//           body: IEcommerceMallAdministratorApprovalRequests.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       requestingMember: ...,
//       requestingSeller: ...,
//       reviewingSuperAdmin: ...,
//       createdAdmin: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_administrator_approval_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------