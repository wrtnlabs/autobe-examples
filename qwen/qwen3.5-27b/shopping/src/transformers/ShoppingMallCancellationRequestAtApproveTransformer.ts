import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCancellationRequestAtApproveTransformer {
  export type Payload = Prisma.shopping_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        response_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        orderItem: true,
        requestSnapshots: true,
        snapshots: true,
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequest.IApprove> {
    return {
      response_reason: input.response_reason ?? undefined,
    } satisfies IShoppingMallCancellationRequest.IApprove;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCancellationRequestAtApproveTransformer {
//       export type Payload = Prisma.shopping_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             response_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_customer_id: true,
//             shopping_mall_order_item_id: true,
//           },
//         } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCancellationRequest.IApprove> {
//         return {
//   response_reason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------