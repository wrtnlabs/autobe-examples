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

export async function test_api_user_sessions_list_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const createdUser: IEconomyPoliticsBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
    });
  const sessionsResponse: IPageIEconomyPoliticsBoardUserSession.ISummary =
    await api.functional.economyPoliticsBoard.user.sessions.index(
      userConnection,
      {
        body: {
          user_id: createdUser.id,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(sessionsResponse);
  TestValidator.predicate("All sessions belong to the user", () => {
    return sessionsResponse.data.every(
      (session: IEconomyPoliticsBoardUserSession.ISummary) =>
        session.user.id === createdUser.id,
    );
  });
}
