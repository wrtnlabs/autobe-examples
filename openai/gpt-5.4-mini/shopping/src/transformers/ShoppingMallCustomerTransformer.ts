import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerProfileTransformer } from "./ShoppingMallCustomerProfileTransformer";

export namespace ShoppingMallCustomerTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        account_status: true,
        banned_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        wishlists: true,
        cart: true,
        orders: true,
        refundRequests: true,
        reviews: true,
        administratorRequestApplicantCustomers: true,
        profile: ShoppingMallCustomerProfileTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      accountStatus: input.account_status,
      bannedAt: input.banned_at?.toISOString() ?? null,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      profile: input.profile
        ? await ShoppingMallCustomerProfileTransformer.transform(input.profile)
        : null,
    };
  }
}
