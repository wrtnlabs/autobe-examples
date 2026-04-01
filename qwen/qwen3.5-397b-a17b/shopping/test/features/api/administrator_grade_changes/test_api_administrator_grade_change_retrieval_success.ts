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

export async function test_api_administrator_grade_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Retrieve administrator grade change record
  const changeId = typia.random<string & tags.Format<"uuid">>();
  const gradeChange =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.at(
      superAdminConnection,
      {
        changeId,
      },
    );
  typia.assert(gradeChange);
  // 3. Validate audit trail completeness - business logic checks
  TestValidator.equals("change ID matches request", gradeChange.id, changeId);
  TestValidator.equals(
    "administrator email present",
    gradeChange.administrator.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "super administrator email present",
    gradeChange.superAdministrator.email.includes("@"),
    true,
  );
  TestValidator.predicate(
    "grade transition occurred",
    gradeChange.previousGrade !== gradeChange.newGrade,
  );
}
