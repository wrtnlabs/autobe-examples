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
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";

export namespace ShoppingMallAdministratorAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: ShoppingMallMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministrator.ISummary> {
    return {
      id: input.id,
      grade: input.grade,
      created_at: input.created_at.toISOString(),
      member: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IShoppingMallAdministrator.ISummary;
  }
}
