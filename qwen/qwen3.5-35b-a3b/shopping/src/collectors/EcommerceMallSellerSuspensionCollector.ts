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
    ecommerceMallAdministrators: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      suspended_at: new Date(),
      resolved_at: null,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Belongs To relations (using connect)
      seller: { connect: { id: props.body.seller_id } },
      suspendedByAdmin: {
        connect: { id: props.ecommerceMallAdministrators.id },
      },
    } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallSellerSuspensionCollector {
//         export async function collect(props: {
//           body: IEcommerceMallSellerSuspension.ICreate;
//           ecommerceMallAdministrators: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       suspended_at: ...,
//       resolved_at: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       suspendedByAdmin: ...,
//           } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
//         }
//       }
//--------------------------------------------------------------