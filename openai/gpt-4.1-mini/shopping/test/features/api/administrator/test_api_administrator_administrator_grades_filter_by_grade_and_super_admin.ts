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

export async function test_api_administrator_administrator_grades_filter_by_grade_and_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass1234",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Prepare filter criteria
  const gradeMin = 5 as number & tags.Type<"int32">;
  const gradeMax = 10 as number & tags.Type<"int32">;
  const superAdministrator = true;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // 3. Call endpoint with filters
  const response =
    await api.functional.shoppingMall.administrator.administratorGrades.index(
      adminConnection,
      {
        body: {
          gradeMin,
          gradeMax,
          superAdministrator,
          page,
          limit,
        } satisfies IShoppingMallAdministratorGrade.IRequest,
      },
    );
  // 4. Assert response structure
  typia.assert(response);
  // 5. Assertions: pagination properties
  TestValidator.predicate(
    "page current is correct",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "page limit is correct",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "all grades in range",
    response.data.every((g) => g.grade >= gradeMin && g.grade <= gradeMax),
  );
  TestValidator.predicate(
    "all superAdministrator matches",
    response.data.every((g) => g.superAdministrator === superAdministrator),
  );
}
