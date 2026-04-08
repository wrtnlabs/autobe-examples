import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceWishlistAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_wishlistsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_wishlistsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceWishlist.ISummary> {
    return {
      id: input.id,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceWishlist.ISummary;
  }
}
