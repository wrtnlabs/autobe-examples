import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        product: true,
        ecommerceProductSnapshotVariants: true,
      },
    } satisfies Prisma.ecommerce_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      category_id: input.category_id,
      base_price: input.base_price,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceProductSnapshot.ISummary;
  }
}
