import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSessionStatus";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test session list with default pagination.
 *
 * Validates that:
 * 1. Response contains pagination metadata
 * 2. Each session includes user summary
 * 3. Each session includes connection metadata
 * 4. Each session includes temporal data
 * 5. Each session has computed status
 * 6. Sensitive tokens are not exposed
 */
export async function test_api_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user to establish a session
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Retrieve session list with default pagination (empty body)
  const sessionsPage = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {} satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(sessionsPage);
  // 3. Validate sensitive tokens are NOT exposed in session data
  for (const session of sessionsPage.data) {
    TestValidator.predicate(
      "session does not expose access_token",
      !("access_token" in session),
    );
    TestValidator.predicate(
      "session does not expose refresh_token",
      !("refresh_token" in session),
    );
  }
}
