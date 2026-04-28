import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerAtSummaryTransformer } from "./EcommercePlatformCustomerAtSummaryTransformer";
import { EcommercePlatformProductAtSummaryTransformer } from "./EcommercePlatformProductAtSummaryTransformer";

export namespace EcommercePlatformReviewAtSummaryTransformer {
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
        customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
        product: EcommercePlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformReview.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      text_content: input.text_content ?? null,
      created_at: input.created_at.toISOString(),
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await EcommercePlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformReviewAtSummaryTransformer {
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
//             ecommerce_platform_order_id: true,
//           },
//         } satisfies Prisma.ecommerce_platform_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformReview.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   text_content: {string | null},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.customer),
//   product: await EcommercePlatformProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------