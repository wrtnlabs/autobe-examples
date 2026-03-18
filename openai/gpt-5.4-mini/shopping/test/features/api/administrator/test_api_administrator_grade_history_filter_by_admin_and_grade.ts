import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeHistory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_history_filter_by_admin_and_grade(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAtDesc",
    shoppingMallAdministratorId: authorized.id,
    performedByAdministratorId: authorized.id,
    previousGrade: authorized.grade,
    newGrade: authorized.grade,
    reason: RandomGenerator.substring(
      RandomGenerator.paragraph({ sentences: 3 }),
    ),
    createdAtStart: null,
    createdAtEnd: null,
  } satisfies IShoppingMallAdministratorGradeHistory.IRequest;
  const response =
    await api.functional.shoppingMall.administrator.administrator_grade_histories.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current should match request page",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned records must not exceed the requested limit",
    response.data.length <= request.limit,
  );
  for (const item of response.data) {
    TestValidator.equals(
      "affected administrator should match filter",
      item.administrator.id,
      authorized.id,
    );
    TestValidator.equals(
      "performed-by administrator should match filter",
      item.performedByAdministrator.id,
      authorized.id,
    );
    TestValidator.equals(
      "previous grade should match filter",
      item.previousGrade,
      request.previousGrade,
    );
    TestValidator.equals(
      "new grade should match filter",
      item.newGrade,
      request.newGrade,
    );
    if (request.reason !== null) {
      TestValidator.predicate(
        "reason keyword should be contained in history reason",
        item.reason !== null && item.reason.includes(request.reason),
      );
    }
  }
}
