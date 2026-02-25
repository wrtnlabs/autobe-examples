import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductCategoryLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductCategoryLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceProductCategoryLinkTransformer {
  export type Payload = Prisma.ecommerce_product_category_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceProductAtSummaryTransformer.select(),
        category: EcommerceCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_product_category_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductCategoryLink> {
    return {
      id: input.id,
      order: input.order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
