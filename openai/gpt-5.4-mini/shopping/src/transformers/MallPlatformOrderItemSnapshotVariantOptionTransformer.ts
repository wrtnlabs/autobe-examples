import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
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
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
    return {
      id: input.id,
      orderItemSnapshot:
        await MallPlatformOrderItemSnapshotAtSummaryTransformer.transform(
          input.orderItemSnapshot,
        ),
      optionName: input.option_name,
      optionValue: input.option_value,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
