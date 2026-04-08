import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";

export namespace EcommerceCartItemTransformer {
  export type Payload = Prisma.ecommerce_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cart: true,
        productVariant: EcommerceProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_cart_itemsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceCartItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      productVariant:
        await EcommerceProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      availabilityStatus: true,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceCartItem;
  }
}
