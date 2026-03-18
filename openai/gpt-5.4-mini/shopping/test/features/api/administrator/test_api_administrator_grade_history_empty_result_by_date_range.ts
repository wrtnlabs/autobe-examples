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

export async function test_api_administrator_grade_history_empty_result_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const createdAtStart: string = new Date(
    "2099-01-01T00:00:00.000Z",
  ).toISOString();
  const createdAtEnd: string = new Date(
    "2099-01-02T00:00:00.000Z",
  ).toISOString();
  const output =
    await api.functional.shoppingMall.administrator.administrator_grade_histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "createdAtDesc",
          shoppingMallAdministratorId: null,
          performedByAdministratorId: null,
          previousGrade: null,
          newGrade: null,
          reason: null,
          createdAtStart,
          createdAtEnd,
        } satisfies IShoppingMallAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty grade history data", output.data, []);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
}
