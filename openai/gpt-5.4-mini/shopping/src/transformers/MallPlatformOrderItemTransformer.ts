import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderAtSummaryTransformer } from "./MallPlatformOrderAtSummaryTransformer";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformOrderItemTransformer {
  export type Payload = Prisma.mall_platform_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrderItem> {
    return {
      id: input.id,
      order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await MallPlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      quantity: input.quantity,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
    } satisfies IMallPlatformOrderItem;
  }
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: MallPlatformOrderAtSummaryTransformer.select(),
        productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
        seller: MallPlatformSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_order_itemsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformOrderItemTransformer {
//       export type Payload = Prisma.mall_platform_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrderItem> {
//         return {
//   id: {string},
//   order: {IMallPlatformOrder.ISummary},
//   productVariant: {IMallPlatformProductVariant.ISummary},
//   seller: {IMallPlatformSeller.ISummary},
//   quantity: {integer},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------