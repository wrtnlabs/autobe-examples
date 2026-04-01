import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformProductVariantSnapshotOptionTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductVariantSnapshotOption> {
    return {
      id: input.id,
      mallPlatformProductVariantSnapshotId:
        input.mall_platform_product_variant_snapshot_id,
      optionKey: input.option_key,
      optionValue: input.option_value,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        mall_platform_product_variant_snapshot_id: true,
        option_key: true,
        option_value: true,
      },
    } satisfies Prisma.mall_platform_product_variant_snapshot_optionsFindManyArgs;
  }
  export type Payload =
    Prisma.mall_platform_product_variant_snapshot_optionsGetPayload<
      ReturnType<typeof select>
    >;
}
