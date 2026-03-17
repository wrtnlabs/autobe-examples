import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotSkusOptionTransformer {
  export type Payload =
    Prisma.shopping_mall_product_snapshot_skus_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        product_snapshot_skus_id: true,
        sequence: true,
        key: true,
        value: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_skus_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotSkusOption> {
    return {
      id: input.id,
      product_snapshot_skus_id: input.product_snapshot_skus_id,
      sequence: input.sequence,
      key: input.key,
      value: input.value,
    };
  }
}
