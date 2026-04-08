import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformRefundRequestTransformer {
  export type Payload = Prisma.mall_platform_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
        seller: MallPlatformSellerAtSummaryTransformer.select(),
        administrator: {
          select: {
            id: true,
          },
        },
        snapshots: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.mall_platform_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformRefundRequest> {
    return {
      id: input.id,
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await MallPlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      administrator: input.administrator
        ? ({
            id: input.administrator.id,
          } as IMallPlatformAdministrator.ISummary)
        : null,
      reason: input.reason,
      status: input.status,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      reviewNote: input.review_note ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformRefundRequestTransformer {
//       export type Payload = Prisma.mall_platform_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             reviewed_at: true,
//             review_note: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//             seller: MallPlatformSellerAtSummaryTransformer.select(),
//             mall_platform_administrator_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformRefundRequest> {
//         return {
//   id: {string},
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await MallPlatformSellerAtSummaryTransformer.transform(input.seller),
//   administrator: {IMallPlatformAdministrator.ISummary | null},
//   reason: {string},
//   status: {string},
//   reviewedAt: {string | null},
//   reviewNote: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------