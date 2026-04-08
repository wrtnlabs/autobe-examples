import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerSuspensionCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerSuspension.ICreate;
    ecommerceMallSellers: IEntity;
    ecommerceMallAdmins: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      restored_reason: null,
      suspended_at: new Date(),
      restored_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      suspendedBy: { connect: { id: props.ecommerceMallAdmins.id } },
      restoredBy: undefined,
    } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallSellerSuspensionCollector {
//         export async function collect(props: {
//           body: IEcommerceMallSellerSuspension.ICreate;
//           ecommerceMallSellers: IEntity; // from path parameter sellerId
// ecommerceMallAdmins: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       restored_reason: ...,
//       suspended_at: ...,
//       restored_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       seller: ...,
//       suspendedBy: ...,
//       restoredBy: ...,
//           } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
//         }
//       }
//--------------------------------------------------------------