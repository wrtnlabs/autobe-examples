import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtTreeTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.ecommerce_mall_categoriesFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        display_order: true,
        icon_uri: true,
        created_at: true,
        updated_at: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            display_order: true,
            icon_uri: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.ITree> {
    return {
      id: input.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? undefined,
      display_order: input.display_order,
      icon_uri: input.icon_uri ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      children: await ArrayUtil.asyncMap(
        input.children,
        EcommerceMallCategoryAtTreeTransformer.transform,
      ),
    } satisfies IEcommerceMallCategory.ITree;
  }
}
