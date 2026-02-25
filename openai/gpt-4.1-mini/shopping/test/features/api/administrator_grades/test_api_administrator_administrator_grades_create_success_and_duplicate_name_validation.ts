import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_grades_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_grades_create";
import { prepare_random_shopping_mall_administrator_grade } from "../../../prepare/prepare_random_shopping_mall_administrator_grade";

export async function test_api_administrator_administrator_grades_create_success_and_duplicate_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a new administrator grade
  const body = {
    name: `role_${RandomGenerator.alphabets(5)}`,
    grade: typia.random<number & tags.Type<"int32">>(),
    superAdministrator: RandomGenerator.pick([true, false]),
  } satisfies IShoppingMallAdministratorGrade.ICreate;
  const createdGrade =
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      adminConnection,
      { body },
    );
  typia.assert(createdGrade);
  // Verify all expected properties
  TestValidator.predicate(
    "has id",
    typeof createdGrade.id === "string" && createdGrade.id.length > 0,
  );
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdGrade.id,
    ),
  );
  TestValidator.equals("name matches", createdGrade.name, body.name);
  TestValidator.equals("grade matches", createdGrade.grade, body.grade);
  TestValidator.equals(
    "superAdministrator matches",
    createdGrade.superAdministrator,
    body.superAdministrator,
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof createdGrade.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof createdGrade.updatedAt === "string",
  );
  TestValidator.equals("deletedAt is null", createdGrade.deletedAt, null);
  // 3. Try to create another grade with duplicate name, expect error
  await TestValidator.error("duplicate name should throw error", async () => {
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      adminConnection,
      { body },
    );
  });
}
