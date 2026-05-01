import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";

export namespace ShoppingMallRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        responded_at: true,
        created_at: true,
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequest.ISummary> {
    return {
      id: input.id,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      status: input.status,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
    } satisfies IShoppingMallRefundRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRefundRequestAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             responded_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequest.ISummary> {
//         return {
//   id: {string},
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   status: {string},
//   reason: {string},
//   created_at: {string},
//   responded_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------