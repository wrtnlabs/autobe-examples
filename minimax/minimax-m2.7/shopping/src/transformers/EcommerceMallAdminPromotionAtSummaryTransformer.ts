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
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionAtSummaryTransformer {
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
        performedBySuperAdmin:
          EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotion.ISummary> {
    return {
      id: input.id,
      action: input.action,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      createdAt: input.created_at.toISOString(),
      performedBySuperAdmin:
        await EcommerceMallSuperAdminAtSummaryTransformer.transform(
          input.performedBySuperAdmin,
        ),
      reason: input.reason ?? undefined,
    } satisfies IEcommerceMallAdminPromotion.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminPromotionAtSummaryTransformer {
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
//             performedBySuperAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminPromotion.ISummary> {
//         return {
//   id: {string},
//   action: {string},
//   admin: await EcommerceMallAdminAtSummaryTransformer.transform(input.admin),
//   createdAt: {string},
//   performedBySuperAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.performedBySuperAdmin),
//   reason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------