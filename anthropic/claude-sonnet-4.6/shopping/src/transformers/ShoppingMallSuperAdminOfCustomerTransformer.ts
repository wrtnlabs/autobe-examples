import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallSuperAdminOfCustomerTransformer {
  export type Payload = Prisma.shopping_mall_super_admin_of_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        superAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_super_adminsFindManyArgs,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_super_admin_of_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdminOfCustomer> {
    return {
      id: input.id,
      superAdminId: input.superAdmin.id,
      customerId: input.customer.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
