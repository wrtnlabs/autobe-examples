import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceProductSnapshotTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        name: true,
        description: true,
        base_price: true,
        seller_id: true,
        category_id: true,
        modified_by_seller_id: true,
        modified_by_administrator_id: true,
        change_reason: true,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_product_snapshotsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductSnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      seller_id: input.seller_id,
      category_id: input.category_id,
      modified_by_seller_id: input.modified_by_seller_id ?? null,
      modified_by_administrator_id: input.modified_by_administrator_id ?? null,
      change_reason: input.change_reason ?? null,
      ecommerce_product_id: input.product.id,
    };
  }
}
