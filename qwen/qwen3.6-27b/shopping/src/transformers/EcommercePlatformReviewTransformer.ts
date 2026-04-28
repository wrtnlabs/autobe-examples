import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
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
import { EcommercePlatformOrderAtSummaryTransformer } from "./EcommercePlatformOrderAtSummaryTransformer";
import { EcommercePlatformProductAtSummaryTransformer } from "./EcommercePlatformProductAtSummaryTransformer";

export namespace EcommercePlatformReviewTransformer {
  export type Payload = Prisma.ecommerce_platform_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        text_content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
        product: EcommercePlatformProductAtSummaryTransformer.select(),
        order: EcommercePlatformOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformReview> {
    return {
      id: input.id,
      rating: input.rating,
      textContent: input.text_content ?? null,
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await EcommercePlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      order: await EcommercePlatformOrderAtSummaryTransformer.transform(
        input.order,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommercePlatformReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformReviewTransformer {
//       export type Payload = Prisma.ecommerce_platform_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             text_content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
//             product: EcommercePlatformProductAtSummaryTransformer.select(),
//             order: EcommercePlatformOrderAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformReview> {
//         return {
//   id: {string},
//   rating: {integer},
//   textContent: {string | null},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.customer),
//   product: await EcommercePlatformProductAtSummaryTransformer.transform(input.product),
//   order: await EcommercePlatformOrderAtSummaryTransformer.transform(input.order),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------