import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        created_at: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategorySnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent_id: input.parent_id,
      created_at: input.created_at.toISOString(),
    };
  }
}
