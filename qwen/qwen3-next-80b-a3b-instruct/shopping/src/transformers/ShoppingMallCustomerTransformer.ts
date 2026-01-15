import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      name:
        (input.first_name || "") +
        (input.last_name ? " " + input.last_name : ""),
      phone: input.phone ?? undefined,
      address: undefined,
    };
  }
}
