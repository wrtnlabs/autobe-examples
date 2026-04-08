import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminPromotionCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminPromotion.ICreate;
    admin: IEntity;
    performedBySuperAdmin: IEntity;
  }) {
    return {
      id: v4(),
      action: "promotion",
      reason: props.body.reason ?? null,
      created_at: new Date(),
      admin: { connect: { id: props.admin.id } },
      performedBySuperAdmin: {
        connect: { id: props.performedBySuperAdmin.id },
      },
    } satisfies Prisma.ecommerce_mall_admin_promotionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallAdminPromotionCollector {
//         export async function collect(props: {
//           body: IEcommerceMallAdminPromotion.ICreate;
//           ecommerceMallAdmins: IEntity; // from path parameter adminId
// ecommerceMallSuperAdmins: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       action: ...,
//       reason: ...,
//       created_at: ...,
//       admin: ...,
//       performedBySuperAdmin: ...,
//           } satisfies Prisma.ecommerce_mall_admin_promotionsCreateInput;
//         }
//       }
//--------------------------------------------------------------