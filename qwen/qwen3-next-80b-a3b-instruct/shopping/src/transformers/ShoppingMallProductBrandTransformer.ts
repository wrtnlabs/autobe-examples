import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductBrandTransformer {
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
  ): Promise<IShoppingMallProductBrand> {
    return {
      id: input.id,
      name: input.name,
      code: input.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      description: undefined,
      logo_url: input.logo_url ?? undefined,
      banner_image_url: undefined,
      is_verified: false,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      status: "active",
    };
  }
}
