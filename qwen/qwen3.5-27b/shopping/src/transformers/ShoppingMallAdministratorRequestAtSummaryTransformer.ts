import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_administrator_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        processedByAdministrator:
          ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorRequest.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      reason: input.reason,
      status: input.status,
      rejection_reason: input.rejection_reason,
      processedByAdministrator: input.processedByAdministrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.processedByAdministrator,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorRequestAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actor_type: true,
//             reason: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             processedByAdministrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_administrator_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorRequest.ISummary> {
//         return {
//   id: {string},
//   actor_type: {string},
//   reason: {string},
//   status: {string},
//   rejection_reason: {string | null},
//   processedByAdministrator: input.processedByAdministrator ? await ShoppingMallAdministratorAtSummaryTransformer.transform(input.processedByAdministrator) : null,
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------