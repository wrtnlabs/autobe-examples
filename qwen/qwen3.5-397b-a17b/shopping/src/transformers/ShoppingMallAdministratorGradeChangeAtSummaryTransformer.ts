import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallSuperAdministratorAtSummaryTransformer } from "./ShoppingMallSuperAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorGradeChangeAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_grade_changesGetPayload<
      ReturnType<typeof select>
    >;
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
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorGradeChange.ISummary> {
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
      previousGrade: input.previous_grade,
      newGrade: input.new_grade,
      reason: input.reason ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
