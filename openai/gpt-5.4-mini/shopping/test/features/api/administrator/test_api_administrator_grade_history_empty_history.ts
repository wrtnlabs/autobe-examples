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

export async function test_api_administrator_grade_history_empty_history(
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
  const page =
    await api.functional.shoppingMall.administrator.administrators.grade_histories.index(
      adminConnection,
      {
        administratorId: authorized.id,
        body: {
          page: 1,
          limit: 10,
          sort: "createdAtDesc",
          shoppingMallAdministratorId: authorized.id,
          performedByAdministratorId: null,
          previousGrade: null,
          newGrade: null,
          reason: null,
          createdAtStart: null,
          createdAtEnd: null,
        } satisfies IShoppingMallAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("grade history should be empty", page.data.length, 0);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.equals("pagination records", page.pagination.records, 0);
  TestValidator.equals("pagination pages", page.pagination.pages, 0);
}
