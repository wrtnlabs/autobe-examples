import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerCollector {
  export async function collect(props: {
    body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
    ecommercePlatformCustomers: IEntity;
  }) {
    const id: string = v4();
    const subtypeId: string = v4();
    return {
      // Scalar fields
      id,
      actor_type: props.body.actorType,
      status: "pending",
      reason: props.body.reason,
      rejection_reason: null,
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      reviewedByAdmin: undefined,
      // HasOne relations
      customerPromotionSubtype: {
        create: {
          id: subtypeId,
          customer: { connect: { id: props.ecommercePlatformCustomers.id } },
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      sellerSubtype: undefined,
    } satisfies Prisma.ecommerce_platform_administrator_promotion_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
//           ecommercePlatformCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       actor_type: ...,
//       status: ...,
//       reason: ...,
//       rejection_reason: ...,
//       reviewed_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       reviewedByAdmin: ...,
//       customerPromotionSubtype: ...,
//       sellerSubtype: ...,
//           } satisfies Prisma.ecommerce_platform_administrator_promotion_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------