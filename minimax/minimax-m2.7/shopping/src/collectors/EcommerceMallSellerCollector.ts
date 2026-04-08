import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerCollector {
  export async function collect(props: { body: IEcommerceMallSeller.ICreate }) {
    return {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      approval_status: "pending",
      rejection_reason: undefined,
      rejected_at: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    } satisfies Prisma.ecommerce_mall_sellersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallSellerCollector {
//         export async function collect(props: {
//           body: IEcommerceMallSeller.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       email: ...,
//       password_hash: ...,
//       approval_status: ...,
//       rejection_reason: ...,
//       rejected_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       sellerSessions: ...,
//       passwordResets: ...,
//       emailVerifications: ...,
//       adminRequest: ...,
//       profile: ...,
//       adminRequests: ...,
//       products: ...,
//       productSnapshots: ...,
//       shipments: ...,
//       cancellationRequests: ...,
//       refundRequests: ...,
//       refundRequestSnapshots: ...,
//       sellerApprovals: ...,
//       sellerSuspensions: ...,
//           } satisfies Prisma.ecommerce_mall_sellersCreateInput;
//         }
//       }
//--------------------------------------------------------------