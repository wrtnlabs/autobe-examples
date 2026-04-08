import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";
import { EcommerceWishlistAtSummaryTransformer } from "./EcommerceWishlistAtSummaryTransformer";

export namespace EcommerceWishlistItemTransformer {
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
        ecommerceWishlist: EcommerceWishlistAtSummaryTransformer.select(),
        ecommerceProduct: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceWishlistItem> {
    return {
      id: input.id,
      ecommerceWishlist: await EcommerceWishlistAtSummaryTransformer.transform(
        input.ecommerceWishlist,
      ),
      ecommerceProduct: await EcommerceProductAtSummaryTransformer.transform(
        input.ecommerceProduct,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceWishlistItem;
  }
}
