import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_comment_analytics_by_role(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator to access analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Call the analytics endpoint to retrieve comment analytics
  const analytics =
    await api.functional.economicBoard.administrator.analytics.comments.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate that response is not null and is an object (as per empty IEconomicBoardComment definition)
  TestValidator.predicate("analytics response is not null", analytics !== null);
  TestValidator.predicate(
    "analytics response is an object",
    typeof analytics === "object",
  );
}
