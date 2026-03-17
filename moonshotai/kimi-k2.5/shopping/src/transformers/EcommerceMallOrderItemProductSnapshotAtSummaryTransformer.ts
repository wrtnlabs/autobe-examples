import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallOrderItemProductSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_product_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        category_name: true,
        base_price: true,
        created_at: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      categoryName: input.category_name ?? null,
      basePrice: input.base_price,
      createdAt: input.created_at.toISOString(),
      category: input.category
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
    };
  }
}
