import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorPromotionRequestAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        rejected_reason: true,
        created_at: true,
        deleted_at: true,
        processedByAdministrator:
          ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorPromotionRequest.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      reason: input.reason,
      status: input.status,
      processed_by_administrator: input.processedByAdministrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.processedByAdministrator,
          )
        : null,
      rejected_reason: input.rejected_reason ?? null,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorPromotionRequestAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_promotion_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actor_type: true,
//             reason: true,
//             status: true,
//             rejected_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             processedByAdministrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_administrator_promotion_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorPromotionRequest.ISummary> {
//         return {
//   id: {string},
//   actor_type: {string},
//   reason: {string},
//   status: {string},
//   processed_by_administrator: input.processedByAdministrator ? await ShoppingMallAdministratorAtSummaryTransformer.transform(input.processedByAdministrator) : null,
//   rejected_reason: {string | null},
//   created_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------