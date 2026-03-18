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

export async function test_api_administrator_grade_history_retrieve_latest_first(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorizedAdministrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorizedAdministrator);
  const response =
    await api.functional.shoppingMall.administrator.administrators.grade_histories.index(
      administratorConnection,
      {
        administratorId: authorizedAdministrator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "createdAtDesc",
          shoppingMallAdministratorId: authorizedAdministrator.id,
          performedByAdministratorId: null,
          previousGrade: null,
          newGrade: null,
          reason: null,
          createdAtStart: null,
          createdAtEnd: null,
        } satisfies IShoppingMallAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(response);
  for (const history of response.data) {
    TestValidator.equals(
      "history belongs to the requested administrator",
      history.administrator.id,
      authorizedAdministrator.id,
    );
    TestValidator.predicate(
      "history includes a performer identity",
      history.performedByAdministrator.id.length > 0,
    );
  }
  for (let index = 1; index < response.data.length; index++) {
    TestValidator.predicate(
      "history is ordered latest first",
      response.data[index - 1].createdAt >= response.data[index].createdAt,
    );
  }
}
