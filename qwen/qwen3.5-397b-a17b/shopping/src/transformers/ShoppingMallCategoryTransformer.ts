import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallCategoryTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        createdByAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_adminsFindManyArgs,
        parent: ShoppingMallCategoryAtSummaryTransformer.select(),
        children: ShoppingMallCategoryAtSummaryTransformer.select(),
        products: true,
        productSnapshots: true,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory> {
    return {
      id: input.id,
      created_by_admin_id: input.createdByAdmin.id,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      parent: input.parent
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(input.parent)
        : null,
      children: await ArrayUtil.asyncMap(
        input.children,
        ShoppingMallCategoryAtSummaryTransformer.transform,
      ),
    };
  }
}
