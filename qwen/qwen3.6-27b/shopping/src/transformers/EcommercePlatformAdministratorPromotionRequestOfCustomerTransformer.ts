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

export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer {
  export type Payload =
    Prisma.ecommerce_platform_administrator_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        status: true,
        reason: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        reviewedByAdmin: EcommercePlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
    return {
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      id: input.id,
      actorType: input.actor_type,
      status: input.status,
      reason: input.reason,
      rejectionReason: input.rejection_reason ?? null,
      reviewedByAdmin: input.reviewedByAdmin
        ? await EcommercePlatformAdminAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
//         return {
//   createdAt: {string},
//   updatedAt: {string},
//   id: {string},
//   actorType: {string},
//   status: {string},
//   reason: {string},
//   rejectionReason: {string | null},
//   reviewedByAdmin: input.reviewedByAdmin ? await EcommercePlatformAdminAtSummaryTransformer.transform(input.reviewedByAdmin) : null,
//   reviewedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------