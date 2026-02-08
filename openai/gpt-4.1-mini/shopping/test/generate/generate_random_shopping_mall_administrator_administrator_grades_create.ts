import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_administrator_grade } from "../prepare/prepare_random_shopping_mall_administrator_grade";

export async function generate_random_shopping_mall_administrator_administrator_grades_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdministratorGrade.ICreate> | undefined;
  },
): Promise<IShoppingMallAdministratorGrade> {
  const prepared: IShoppingMallAdministratorGrade.ICreate =
    prepare_random_shopping_mall_administrator_grade(props.body);
  const result: IShoppingMallAdministratorGrade =
    await api.functional.shoppingMall.administrator.administrator.grades.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
