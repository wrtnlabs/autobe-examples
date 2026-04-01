import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCategoryAtSummaryTransformer } from "./MallPlatformCategoryAtSummaryTransformer";

export namespace MallPlatformCategoryTransformer {
  export type Payload = Prisma.mall_platform_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
      parentCategory: input.parentCategory
        ? await MallPlatformCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : null,
      subcategories: await ArrayUtil.asyncMap(
        input.subcategories,
        async (item) =>
          MallPlatformCategoryAtSummaryTransformer.transform(item),
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parentCategory: MallPlatformCategoryAtSummaryTransformer.select(),
        products: { select: { id: true } },
        subcategories: {
          select: MallPlatformCategoryAtSummaryTransformer.select().select,
        },
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
}
