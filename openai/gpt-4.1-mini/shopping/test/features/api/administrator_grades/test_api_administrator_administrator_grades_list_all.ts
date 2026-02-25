import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGrade";
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

export async function test_api_administrator_administrator_grades_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Use the authorized connection (with Authorization header set) for listing grades
  // Clone connection with token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuthorized.token.access}`,
    },
  };
  // 3. Request without any filters or pagination parameters (defaults should return all)
  const listBody: IShoppingMallAdministratorGrade.IRequest = {};
  const gradeList =
    await api.functional.shoppingMall.administrator.administratorGrades.index(
      authorizedConnection,
      { body: listBody },
    );
  typia.assert(gradeList);
  // 4. Validate structure: pagination must exist and have required properties
  const { pagination, data } = gradeList;
  typia.assert(pagination);
  typia.assert(data);
  TestValidator.predicate(
    "pagination current page at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit at least 1", pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate each grade summary fields exist and are valid
  data.forEach((grade, idx) => {
    typia.assert(grade);
    // ID must be uuid format
    TestValidator.predicate(
      `grade[${idx}].id format uuid`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        grade.id,
      ),
    );
    // Name non-empty string
    TestValidator.predicate(
      `grade[${idx}].name is string and non-empty`,
      typeof grade.name === "string" && grade.name.length > 0,
    );
    // Grade is valid int32 (>=0, generally >0)
    TestValidator.predicate(
      `grade[${idx}].grade is positive int32`,
      Number.isInteger(grade.grade) && grade.grade >= 0,
    );
    // superAdministrator is boolean
    TestValidator.predicate(
      `grade[${idx}].superAdministrator is boolean`,
      typeof grade.superAdministrator === "boolean",
    );
  });
}
