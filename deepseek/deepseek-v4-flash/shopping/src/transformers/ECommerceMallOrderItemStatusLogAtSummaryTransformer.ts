import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";

export namespace ECommerceMallOrderItemStatusLogAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_order_item_status_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        from_status: true,
        to_status: true,
        reason: true,
        created_at: true,
        orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_order_item_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrderItemStatusLog.ISummary> {
    return {
      id: input.id,
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      from_status: input.from_status,
      to_status: input.to_status,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallOrderItemStatusLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderItemStatusLogAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_order_item_status_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             from_status: true,
//             to_status: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_order_item_status_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrderItemStatusLog.ISummary> {
//         return {
//   id: {string},
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   from_status: {string | null},
//   to_status: {string},
//   reason: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------