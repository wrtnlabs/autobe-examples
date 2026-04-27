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

export namespace ECommerceMallSellerSuspensionLogTransformer {
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
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_seller_suspension_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerSuspensionLog> {
    return {
      id: input.id,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      action: input.action,
      reason: input.reason,
      actorType: input.actor_type,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerSuspensionLogTransformer {
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
//       export async function transform(input: Payload): Promise<IECommerceMallSellerSuspensionLog> {
//         return {
//   id: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   action: {string},
//   reason: {string | null},
//   actorType: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------