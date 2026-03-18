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

export async function test_api_administrator_grade_history_list(
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
  const historyConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAtDesc",
    shoppingMallAdministratorId: null,
    performedByAdministratorId: null,
    previousGrade: null,
    newGrade: null,
    reason: null,
    createdAtStart: null,
    createdAtEnd: null,
  } satisfies IShoppingMallAdministratorGradeHistory.IRequest;
  const output =
    await api.functional.shoppingMall.administrator.administrator_grade_histories.index(
      historyConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history list is within page limit",
    output.data.length <= request.limit,
  );
  TestValidator.predicate("history list is sorted newest first", () =>
    output.data.every((entry, index, array) =>
      index === 0 ? true : array[index - 1].createdAt >= entry.createdAt,
    ),
  );
  TestValidator.predicate(
    "history entries include administrator references and timestamps",
    output.data.every(
      (entry) =>
        entry.administrator.id.length > 0 &&
        entry.performedByAdministrator.id.length > 0 &&
        entry.createdAt.length > 0 &&
        entry.updatedAt.length > 0,
    ),
  );
}
