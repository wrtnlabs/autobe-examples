import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "./ShoppingMallCancellationRequestAtSummaryTransformer";

export namespace ShoppingMallCancellationRequestSnapshotTransformer {
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
        cancellationRequest:
          ShoppingMallCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequestSnapshot> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      cancellationRequest:
        await ShoppingMallCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallCancellationRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCancellationRequestSnapshotTransformer {
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
//             cancellationRequest: ShoppingMallCancellationRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCancellationRequestSnapshot> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   cancellationRequest: await ShoppingMallCancellationRequestAtSummaryTransformer.transform(input.cancellationRequest),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------