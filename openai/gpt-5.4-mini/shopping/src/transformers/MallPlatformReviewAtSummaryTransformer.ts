import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformReviewAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_reviewsGetPayload<
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
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
        orderItem: true,
        product: MallPlatformProductAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.mall_platform_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformReview.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content ?? null,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformReview.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformReviewAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_reviewsGetPayload<ReturnType<typeof select>>;
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
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//             order_item_id: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformReview.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------