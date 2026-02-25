import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import type { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the user account (this creates the session for user)
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://test.url",
      referrer: "http://test.referrer",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  // 2. Get session list to validate we have a session
  const sessionList =
    await api.functional.economicPoliticalDiscussionBoard.user.sessions.index(
      userConnection,
      {
        body: {
          page: 1,
          size: 10,
        } satisfies IEconomicPoliticalDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // 3. Extract the first session ID from the session list
  if (sessionList.data.length === 0) {
    throw new Error("No sessions found for user");
  }
  const sessionId = sessionList.data[0].id;
  // 4. Retrieve session details using the session ID
  const session =
    await api.functional.economicPoliticalDiscussionBoard.user.sessions.at(
      userConnection,
      {
        sessionId: sessionId satisfies string & tags.Format<"uuid">,
      },
    );
  typia.assert(session);
  // 5. Validate that the session belongs to the correct user
  TestValidator.equals(
    "session user id matches",
    session.user.id,
    authorized.user.id,
  );
}
