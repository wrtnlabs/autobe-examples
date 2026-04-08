import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallCustomerProfileTransformer } from "./ShoppingMallCustomerProfileTransformer";

export namespace ShoppingMallMemberTransformer {
  export type Payload = Prisma.shopping_mall_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: ShoppingMallCustomerProfileTransformer.select(),
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMember> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      profile: input.customerProfile
        ? await ShoppingMallCustomerProfileTransformer.transform(
            input.customerProfile,
          )
        : null,
      administrator: input.administrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallMember;
  }
}
