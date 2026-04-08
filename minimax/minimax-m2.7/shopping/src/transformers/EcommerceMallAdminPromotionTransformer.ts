import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminTransformer } from "./EcommerceMallSuperAdminTransformer";

export namespace EcommerceMallAdminPromotionTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        created_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        performedBySuperAdmin: EcommerceMallSuperAdminTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotion> {
    return {
      id: input.id,
      action: input.action,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      performedBySuperAdmin: await EcommerceMallSuperAdminTransformer.transform(
        input.performedBySuperAdmin,
      ),
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceMallAdminPromotion;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminPromotionTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_promotionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             reason: true,
//             created_at: true,
//             admin: EcommerceMallAdminAtSummaryTransformer.select(),
//             performedBySuperAdmin: EcommerceMallSuperAdminTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminPromotion> {
//         return {
//   id: {string},
//   action: {string},
//   admin: await EcommerceMallAdminAtSummaryTransformer.transform(input.admin),
//   performedBySuperAdmin: await EcommerceMallSuperAdminTransformer.transform(input.performedBySuperAdmin),
//   reason: {null | string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------