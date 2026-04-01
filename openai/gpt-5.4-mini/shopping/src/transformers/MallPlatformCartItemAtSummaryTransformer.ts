import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";
import { MallPlatformShoppingCartAtSummaryTransformer } from "./MallPlatformShoppingCartAtSummaryTransformer";

export namespace MallPlatformCartItemAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCartItem.ISummary> {
    return {
      id: input.id,
      shoppingCart:
        await MallPlatformShoppingCartAtSummaryTransformer.transform({
          id: input.mall_platform_shopping_cart_id,
        } as any),
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform({
          id: input.mall_platform_product_variant_id,
        } as any),
      quantity: input.quantity,
      availabilityState: input.availability_state,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
    };
  }
  export function select(): Prisma.mall_platform_cart_itemsFindManyArgs {
    return {
      select: {
        id: true,
        mall_platform_shopping_cart_id: true,
        mall_platform_product_variant_id: true,
        quantity: true,
        availability_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.mall_platform_cart_itemsFindManyArgs;
  }
}
