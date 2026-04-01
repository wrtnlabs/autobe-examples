import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "./MallPlatformProductSnapshotAtSummaryTransformer";

export namespace MallPlatformProductSnapshotVariantTransformer {
  export type Payload =
    Prisma.mall_platform_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_available: true,
        created_at: true,
        productSnapshot:
          MallPlatformProductSnapshotAtSummaryTransformer.select(),
        productVariantSnapshot: true,
      },
    } satisfies Prisma.mall_platform_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshotVariant> {
    return {
      id: input.id,
      productSnapshot:
        await MallPlatformProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride: input.price_override,
      isAvailable: input.is_available,
      createdAt: input.created_at.toISOString(),
    };
  }
}
