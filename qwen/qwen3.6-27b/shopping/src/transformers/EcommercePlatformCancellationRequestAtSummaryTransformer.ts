import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
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
import { EcommercePlatformCustomerAtSummaryTransformer } from "./EcommercePlatformCustomerAtSummaryTransformer";
import { EcommercePlatformOrderItemAtSummaryTransformer } from "./EcommercePlatformOrderItemAtSummaryTransformer";

export namespace EcommercePlatformCancellationRequestAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_platform_cancellation_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response_reason: true,
        created_at: true,
        orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
        customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformCancellationRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      sellerResponseReason: input.seller_response_reason ?? null,
      orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommercePlatformCancellationRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCancellationRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             seller_response_reason: true,
//             created_at: true,
//             updated_at: true,
//             orderItem: EcommercePlatformOrderItemAtSummaryTransformer.select(),
//             customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   sellerResponseReason: {string | null},
//   orderItem: await EcommercePlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.customer),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------