import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformAdminAtSummaryTransformer } from "./EcommercePlatformAdminAtSummaryTransformer";

export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer {
  // 1. Payload type
  export type Payload =
    Prisma.ecommerce_platform_administrator_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        status: true,
        reason: true,
        rejection_reason: true,
        reviewed_at: true,
        reviewedByAdmin: EcommercePlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_administrator_promotion_requestsFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type as "customer" | "seller",
      status: input.status as "pending" | "approved" | "rejected",
      reason: input.reason,
      rejection_reason: input.rejection_reason,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      reviewedByAdmin: input.reviewedByAdmin
        ? await EcommercePlatformAdminAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
    } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_administrator_promotion_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actor_type: true,
//             status: true,
//             reason: true,
//             rejection_reason: true,
//             reviewed_at: true,
//             created_at: true,
//             updated_at: true,
//             reviewedByAdmin: EcommercePlatformAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_administrator_promotion_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
//         return {
//   id: {string},
//   actor_type: {"customer" | "seller"},
//   status: {"pending" | "approved" | "rejected"},
//   reason: {string},
//   rejection_reason: {string | null},
//   reviewed_at: {string | null},
//   reviewedByAdmin: input.reviewedByAdmin ? await EcommercePlatformAdminAtSummaryTransformer.transform(input.reviewedByAdmin) : null,
//         };
//       }
//     }
//--------------------------------------------------------------