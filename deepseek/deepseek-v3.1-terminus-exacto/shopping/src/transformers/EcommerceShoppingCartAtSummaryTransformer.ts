import { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceShoppingCartAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_shopping_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
        metadataRegistryRelationships: true,
        cartItems: true,
      },
    } satisfies Prisma.ecommerce_shopping_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceShoppingCart.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer_id: input.customer.id,
    };
  }
}
