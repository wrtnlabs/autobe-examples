import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";

export namespace ShoppingMallCancellationRequestAtSummaryTransformer {
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
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequest.ISummary> {
    return {
      id: input.id,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallCancellationRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCancellationRequestAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   reason: {string},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------