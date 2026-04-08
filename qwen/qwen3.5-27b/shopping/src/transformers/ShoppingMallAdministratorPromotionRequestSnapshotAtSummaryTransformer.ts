import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        user_type: true,
        reason: true,
        status: true,
        approved_by: true,
        response_reason: true,
        created_at: true,
        promotionRequest: true,
      },
    } satisfies Prisma.shopping_mall_administrator_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorPromotionRequestSnapshot.ISummary> {
    return {
      id: input.id,
      user_type: input.user_type,
      reason: input.reason,
      status: input.status,
      approved_by: input.approved_by,
      response_reason: input.response_reason,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_promotion_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             user_id: true,
//             user_type: true,
//             reason: true,
//             status: true,
//             approved_by: true,
//             response_reason: true,
//             created_at: true,
//             shopping_mall_administrator_promotion_request_id: true,
//           },
//         } satisfies Prisma.shopping_mall_administrator_promotion_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorPromotionRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   user_type: {string},
//   reason: {string},
//   status: {string},
//   approved_by: {string | null},
//   response_reason: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------