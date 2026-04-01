import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        variants: {},
        images: {},
        productSnapshots: {},
        variantSnapshots: {},
        reviews: {},
        wishlistItems: {},
        entitySnapshots: {},
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: Number(input.base_price),
      slug: input.slug,
      status: input.status,
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
