import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "./ShoppingMallRefundRequestAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallRefundRequestSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        refundRequest: ShoppingMallRefundRequestAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequest:
        await ShoppingMallRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallRefundRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRefundRequestSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             refundRequest: ShoppingMallRefundRequestAtSummaryTransformer.select(),
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequestSnapshot> {
//         return {
//   id: {string},
//   refundRequest: await ShoppingMallRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   reason: {string},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------