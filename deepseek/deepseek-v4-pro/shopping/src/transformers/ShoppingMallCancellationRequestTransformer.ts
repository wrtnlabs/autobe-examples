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
import { ShoppingMallCancellationRequestSnapshotTransformer } from "./ShoppingMallCancellationRequestSnapshotTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";

export namespace ShoppingMallCancellationRequestTransformer {
  export type Payload = Prisma.shopping_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        snapshots: ShoppingMallCancellationRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        ShoppingMallCancellationRequestSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCancellationRequestTransformer {
//       export type Payload = Prisma.shopping_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//             snapshots: ShoppingMallCancellationRequestSnapshotTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCancellationRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   snapshots: await ArrayUtil.asyncMap(input.snapshots, ShoppingMallCancellationRequestSnapshotTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------