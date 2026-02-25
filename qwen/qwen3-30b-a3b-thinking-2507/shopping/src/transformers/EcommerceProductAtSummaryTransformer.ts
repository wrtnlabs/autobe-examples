import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";

export namespace EcommerceProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        category: EcommerceCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      base_price: Number(input.base_price),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
