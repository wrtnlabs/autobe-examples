import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_token_refresh_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const joined: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(joined);

  // 2. Login with the same member credentials
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IDiscussionBoardMember.ILogin;
  const logged: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(logged);

  // 3. Refresh token using the refresh token from login
  const refreshBody = {
    refresh_token: logged.token.refresh,
    token_type: "refresh",
  } satisfies IDiscussionBoardMember.IRefresh;
  const refreshed: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // Ensure the new access and refresh tokens differ from the old ones
  TestValidator.notEquals(
    "refresh token should update",
    refreshed.token.refresh,
    logged.token.refresh,
  );
  TestValidator.notEquals(
    "access token should update",
    refreshed.token.access,
    logged.token.access,
  );
  TestValidator.equals(
    "member id should remain the same",
    refreshed.id,
    logged.id,
  );
  TestValidator.equals(
    "member email should remain the same",
    refreshed.email,
    logged.email,
  );
  TestValidator.equals(
    "member display name should remain the same",
    refreshed.display_name,
    logged.display_name,
  );
}
