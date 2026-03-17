import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote } from "../../../generate/generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote";
import { prepare_random_shopping_mall_administrator_grade_change } from "../../../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function test_api_administrator_grade_change_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const authorized = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const requestBody = {
    reason,
  } satisfies IShoppingMallAdministratorGradeChange.ICreate;
  const gradeChange =
    await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
      superAdministratorConnection,
      {
        params: {
          administratorId,
        },
        body: requestBody,
      },
    );
  typia.assert(gradeChange);
  TestValidator.notEquals(
    "grade change record id must be newly generated",
    gradeChange.id,
    administratorId,
  );
  TestValidator.equals(
    "target administrator id matches request path",
    gradeChange.administrator.id,
    administratorId,
  );
  TestValidator.equals(
    "acting super administrator id matches authenticated actor",
    gradeChange.superAdministrator.id,
    authorized.id,
  );
  TestValidator.equals(
    "acting super administrator email matches authenticated actor",
    gradeChange.superAdministrator.email,
    authorized.email,
  );
  TestValidator.equals(
    "acting super administrator active state matches authenticated actor",
    gradeChange.superAdministrator.active,
    authorized.active,
  );
  TestValidator.equals(
    "previous grade is administrator",
    gradeChange.previous_grade,
    "administrator",
  );
  TestValidator.equals(
    "new grade is superAdministrator",
    gradeChange.new_grade,
    "superAdministrator",
  );
  TestValidator.equals("reason is preserved", gradeChange.reason, reason);
  TestValidator.equals(
    "administrator becomes super administrator after successful promotion",
    gradeChange.administrator.grade,
    "superAdministrator",
  );
}
