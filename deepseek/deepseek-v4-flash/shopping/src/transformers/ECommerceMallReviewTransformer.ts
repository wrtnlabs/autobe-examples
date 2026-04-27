import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
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
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallOrderAtSummaryTransformer } from "./ECommerceMallOrderAtSummaryTransformer";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";
import { ECommerceMallProductAtSummaryTransformer } from "./ECommerceMallProductAtSummaryTransformer";

export namespace ECommerceMallReviewTransformer {
  export type Payload = Prisma.e_commerce_mall_reviewsGetPayload<
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
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        product: ECommerceMallProductAtSummaryTransformer.select(),
        orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
        order: ECommerceMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallReview> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      order: await ECommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallReviewTransformer {
//       export type Payload = Prisma.e_commerce_mall_reviewsGetPayload<ReturnType<typeof select>>;
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
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             product: ECommerceMallProductAtSummaryTransformer.select(),
//             orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
//             order: ECommerceMallOrderAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallReview> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   order: await ECommerceMallOrderAtSummaryTransformer.transform(input.order),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------