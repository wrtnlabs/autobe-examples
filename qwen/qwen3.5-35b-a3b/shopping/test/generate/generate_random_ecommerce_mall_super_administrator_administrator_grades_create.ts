import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_administrator_grade } from "../prepare/prepare_random_ecommerce_mall_administrator_grade";

export async function generate_random_ecommerce_mall_super_administrator_administrator_grades_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdministratorGrade.ICreate> | undefined;
  },
): Promise<IEcommerceMallAdministratorGrade> {
  const prepared: IEcommerceMallAdministratorGrade.ICreate =
    prepare_random_ecommerce_mall_administrator_grade(props.body);
  const result: IEcommerceMallAdministratorGrade =
    await api.functional.ecommerceMall.superAdministrator.administrator_grades.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
