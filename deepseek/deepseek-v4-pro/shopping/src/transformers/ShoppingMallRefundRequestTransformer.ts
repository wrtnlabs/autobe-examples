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

export namespace ShoppingMallRefundRequestTransformer {
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
        updated_at: true,
        deleted_at: true,
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRefundRequestTransformer {
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
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   responded_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------