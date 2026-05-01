import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallCancellationRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCancellationRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             shopping_mall_cancellation_request_id: true,
//           },
//         } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCancellationRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------