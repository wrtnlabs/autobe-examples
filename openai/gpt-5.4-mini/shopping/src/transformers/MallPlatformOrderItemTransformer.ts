import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
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
      quantity: input.quantity,
      status: input.status,
      order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await MallPlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
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
        shipmentItem: { select: {} },
        cancellationRequests: { select: {} },
        refundRequests: { select: {} },
        review: { select: {} },
        snapshots: { select: {} },
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
//             order: MallPlatformOrderAtSummaryTransformer.select(),
//             productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
//             seller: MallPlatformSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrderItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   status: {string},
//   order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   seller: await MallPlatformSellerAtSummaryTransformer.transform(input.seller),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------