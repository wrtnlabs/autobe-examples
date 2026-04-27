import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallSellerSuspensionLogAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_seller_suspension_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        actor_type: true,
        created_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_seller_suspension_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerSuspensionLog.ISummary> {
    return {
      id: input.id,
      action: input.action,
      reason: input.reason ?? null,
      actor_type: input.actor_type,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallSellerSuspensionLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerSuspensionLogAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_seller_suspension_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action: true,
//             reason: true,
//             actor_type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_seller_suspension_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSellerSuspensionLog.ISummary> {
//         return {
//   id: {string},
//   action: {string},
//   reason: {string | null},
//   actor_type: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------