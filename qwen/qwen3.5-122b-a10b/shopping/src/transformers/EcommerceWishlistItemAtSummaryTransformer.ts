import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerceWishlist: { select: { id: true } },
        ecommerceProduct: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceWishlistItem.ISummary> {
    return {
      id: input.id,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.ecommerceProduct,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceWishlistItem.ISummary;
  }
}
