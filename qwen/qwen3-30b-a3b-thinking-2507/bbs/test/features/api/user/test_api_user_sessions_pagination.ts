import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Request session data with pagination
  const sessions =
    await api.functional.economyPoliticsBoard.user.sessions.index(
      userConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEconomyPoliticsBoardUserSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate pagination
  TestValidator.equals("session count", sessions.data.length, 10);
  TestValidator.equals("page number", sessions.pagination.current, 2);
  TestValidator.equals("page limit", sessions.pagination.limit, 10);
  TestValidator.predicate("has more pages", sessions.pagination.pages > 1);
}
