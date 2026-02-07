import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartSnapshot";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCartAtSummaryTransformer } from "./EcommerceCartAtSummaryTransformer";

export namespace EcommerceCartSnapshotTransformer {
  export type Payload = Prisma.ecommerce_cart_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cart: EcommerceCartAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_cart_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCartSnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      cart: await EcommerceCartAtSummaryTransformer.transform(input.cart),
    };
  }
}
