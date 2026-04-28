import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";

export namespace EcommercePlatformRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        refund_reason: true,
        status: true,
        responded_at: true,
        orderItem: {
          select: {
            id: true,
          },
        },
        sellerProfile:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
        refundRequestSnapshots: {
          select: {},
        } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_platform_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformRefundRequest.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      order_item_id: input.orderItem.id,
      refund_reason: input.refund_reason,
      responded_at: input.responded_at?.toISOString() ?? null,
      seller_profile:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      status: input.status,
    } satisfies IEcommercePlatformRefundRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformRefundRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             refund_reason: true,
//             status: true,
//             responded_at: true,
//             created_at: true,
//             updated_at: true,
//             order_item_id: true,
//             sellerProfile: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformRefundRequest.ISummary> {
//         return {
//   id: {string},
//   created_at: {string},
//   order_item_id: {string},
//   refund_reason: {string},
//   responded_at: {string | null},
//   seller_profile: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------