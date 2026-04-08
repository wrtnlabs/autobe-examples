import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallReviewTransformer {
  export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        reviewSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
    } satisfies IEcommerceMallReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewTransformer {
//       export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//         };
//       }
//     }
//--------------------------------------------------------------