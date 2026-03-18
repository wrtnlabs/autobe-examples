import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrator_grade_history_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const administratorGradeHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  const output =
    await api.functional.shoppingMall.administrator.administrator_grade_histories.at(
      adminConnection,
      {
        administratorGradeHistoryId,
      },
    );
  typia.assert(output);
  TestValidator.equals("history id must be uuid", output.id, output.id);
  TestValidator.predicate(
    "reason may be null",
    output.reason === null || output.reason.length >= 0,
  );
  TestValidator.predicate(
    "deletedAt may be null",
    output.deletedAt === null || output.deletedAt.length >= 0,
  );
}
