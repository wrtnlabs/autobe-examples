import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallSuperAdministratorAtSummaryTransformer } from "./ShoppingMallSuperAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorGradeChangeTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorGradeChange> {
    return {
      id: input.id,
      administrator:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      superAdministrator:
        await ShoppingMallSuperAdministratorAtSummaryTransformer.transform(
          input.superAdministrator,
        ),
      previous_grade: input.previous_grade,
      new_grade: input.new_grade,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        previous_grade: true,
        new_grade: true,
        reason: true,
        created_at: true,
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        superAdministrator:
          ShoppingMallSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_grade_changesFindManyArgs;
  }
  export type Payload =
    Prisma.shopping_mall_administrator_grade_changesGetPayload<
      ReturnType<typeof select>
    >;
}
