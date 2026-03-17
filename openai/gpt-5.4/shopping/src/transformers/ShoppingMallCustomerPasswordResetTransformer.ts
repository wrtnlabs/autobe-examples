import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallCustomerPasswordResetTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerPasswordReset> {
    return {
      id: input.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      expired_at: input.expired_at.toISOString(),
      consumed_at: input.consumed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      token: input.token as unknown as boolean,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        expired_at: true,
        consumed_at: true,
        created_at: true,
        updated_at: true,
        token: true,
      },
    } satisfies Prisma.shopping_mall_customer_password_resetsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_customer_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
}
