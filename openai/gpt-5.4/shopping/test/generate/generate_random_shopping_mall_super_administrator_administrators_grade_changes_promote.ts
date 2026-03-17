import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_administrator_grade_change } from "../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallAdministratorGradeChange.ICreate>
      | undefined;
    params: {
      administratorId: string;
    };
  },
): Promise<IShoppingMallAdministratorGradeChange> {
  const prepared: IShoppingMallAdministratorGradeChange.ICreate =
    prepare_random_shopping_mall_administrator_grade_change(props.body);
  const result: IShoppingMallAdministratorGradeChange =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.promote(
      connection,
      {
        body: prepared,
        administratorId: props.params.administratorId,
      },
    );
  return result;
}
