import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_status: true,
        new_status: true,
        previous_reason: true,
        new_reason: true,
        adminPromotionRequest: {
          select: {
            id: true,
          },
        },
        previousReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        newReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      previousStatus: input.previous_status,
      newStatus: input.new_status,
      previousReason: input.previous_reason ?? null,
      newReason: input.new_reason ?? null,
      previousReviewer: input.previousReviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.previousReviewer,
          )
        : null,
      newReviewer: input.newReviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.newReviewer,
          )
        : null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_promotion_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_status: true,
//             new_status: true,
//             previous_reason: true,
//             new_reason: true,
//             created_at: true,
//             admin_promotion_request_id: true,
//             previous_reviewer_id: true,
//             new_reviewer_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   previousStatus: {string},
//   newStatus: {string},
//   previousReviewer: {IEcommerceMallAdmin.ISummary | null},
//   newReviewer: {IEcommerceMallAdmin.ISummary | null},
//   previousReason: {string | null},
//   newReason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------