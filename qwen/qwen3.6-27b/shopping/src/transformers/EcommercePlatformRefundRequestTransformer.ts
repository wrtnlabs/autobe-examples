import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformOrderItemAtSummaryTransformer } from "./EcommercePlatformOrderItemAtSummaryTransformer";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";

export namespace EcommercePlatformRefundRequestTransformer {
  export type Payload = Prisma.ecommerce_platform_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        refund_reason: true,
        status: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
        sellerProfile:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformRefundRequest> {
    return {
      id: input.id,
      orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      sellerProfile:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      refundReason: input.refund_reason,
      status: input.status,
      respondedAt: input.responded_at?.toISOString() ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommercePlatformRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformRefundRequestTransformer {
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
//             orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
//             sellerProfile: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformRefundRequest> {
//         return {
//   id: {string},
//   orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   sellerProfile: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   refundReason: {string},
//   status: {string},
//   respondedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------