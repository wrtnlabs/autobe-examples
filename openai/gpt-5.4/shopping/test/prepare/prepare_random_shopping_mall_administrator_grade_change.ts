import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_administrator_grade_change(
  input?: DeepPartial<IShoppingMallAdministratorGradeChange.ICreate>,
): IShoppingMallAdministratorGradeChange.ICreate {
  return {
    reason:
      input?.reason !== undefined
        ? input.reason
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
