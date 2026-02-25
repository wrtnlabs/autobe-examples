import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

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
        category: EcommerceCategoryAtSummaryTransformer.select(),
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category
        ? await EcommerceCategoryAtSummaryTransformer.transform(input.category)
        : undefined,
      base_price: Number(input.base_price),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
    };
  }
}
