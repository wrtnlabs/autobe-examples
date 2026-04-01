import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        profile: ShoppingMallCustomerProfileTransformer.select(),
        customerProfileSnapshots: true,
        addresses: true,
        wishlistItems: true,
        cart: true,
        orders: true,
        reviews: true,
        cancellationRequests: true,
        refundRequests: true,
        adminPromotionRequests: true,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      profile: input.profile
        ? await ShoppingMallCustomerProfileTransformer.transform(input.profile)
        : (undefined as unknown as IShoppingMallCustomerProfile),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } as IShoppingMallCustomer;
  }
}
