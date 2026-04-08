import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
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
import { MallPlatformOrderItemSnapshotAtSummaryTransformer } from "./MallPlatformOrderItemSnapshotAtSummaryTransformer";

export namespace MallPlatformOrderItemSnapshotVariantOptionTransformer {
  export type Payload =
    Prisma.mall_platform_order_item_snapshot_variant_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
    return {
      id: input.id,
      optionName: input.option_name,
      optionValue: input.option_value,
      orderItemSnapshot:
        await MallPlatformOrderItemSnapshotAtSummaryTransformer.transform(
          input.orderItemSnapshot,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformOrderItemSnapshotVariantOption;
  }
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItemSnapshot:
          MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_order_item_snapshot_variant_optionsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformOrderItemSnapshotVariantOptionTransformer {
//       export type Payload = Prisma.mall_platform_order_item_snapshot_variant_optionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             option_name: true,
//             option_value: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItemSnapshot: MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_order_item_snapshot_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
//         return {
//   id: {string},
//   optionName: {string},
//   optionValue: {string},
//   orderItemSnapshot: await MallPlatformOrderItemSnapshotAtSummaryTransformer.transform(input.orderItemSnapshot),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------