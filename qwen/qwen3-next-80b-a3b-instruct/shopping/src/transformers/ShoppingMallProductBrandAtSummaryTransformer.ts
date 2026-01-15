import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductBrandAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_brandsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        logo_url: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_product_brandsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductBrand.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: undefined, // Not in schema - use default
      logo_url: input.logo_url ?? undefined,
      status: "active", // Default business rule
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      product_count: 0, // No product relationship in schema
      is_verified: false, // Default business rule
    };
  }
}
