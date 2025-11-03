import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuthRefreshRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthRefreshRequest";
import type { IDiscussionBoardAuthRefreshResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthRefreshResponse";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_session_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // Step 2: Authenticate the moderator to obtain refresh token
  const href = "https://example.com/login";
  const referrer = "https://example.com/home";
  const loginBody: IDiscussionBoardModerator.ILogin = {
    email: moderatorEmail,
    password: "password123",
    href,
    referrer,
  };
  const authenticated: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticated);
  const refreshToken = authenticated.token.refresh;

  // Step 3: Use refresh token to obtain new access token
  const refreshRequest: IDiscussionBoardAuthRefreshRequest = {
    refresh_token: refreshToken,
  };
  const refreshed: IDiscussionBoardAuthRefreshResponse =
    await api.functional.discussionBoard.moderator.auth.moderator.refresh(
      connection,
      {
        body: refreshRequest,
      },
    );
  typia.assert(refreshed);

  // Step 4: Validate that refresh was successful
  TestValidator.equals(
    "refreshed token is a string",
    typeof refreshed,
    "string",
  );
  TestValidator.predicate(
    "refreshed token length is reasonable",
    refreshed.length > 50,
  );
}
