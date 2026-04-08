import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformReviewTransformer {
  export type Payload = Prisma.mall_platform_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformReview> {
    return {
      id: input.id,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      rating: input.rating,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformReview;
  }
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
        orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
        product: MallPlatformProductAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.mall_platform_reviewsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformReviewTransformer {
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
//             orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformReview> {
//         return {
//   id: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   rating: {integer},
//   content: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------