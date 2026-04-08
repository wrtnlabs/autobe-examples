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

export namespace ShoppingMallAdministratorPromotionRequestTransformer {
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
        updated_at: true,
        deleted_at: true,
        processedByAdministrator:
          ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorPromotionRequest> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      reason: input.reason,
      status: input.status,
      rejected_reason: input.rejected_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      processedByAdministrator: input.processedByAdministrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.processedByAdministrator,
          )
        : null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorPromotionRequestTransformer {
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
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorPromotionRequest> {
//         return {
//   id: {string},
//   actor_type: {string},
//   reason: {string},
//   status: {string},
//   rejected_reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   processedByAdministrator: input.processedByAdministrator ? await ShoppingMallAdministratorAtSummaryTransformer.transform(input.processedByAdministrator) : null,
//         };
//       }
//     }
//--------------------------------------------------------------