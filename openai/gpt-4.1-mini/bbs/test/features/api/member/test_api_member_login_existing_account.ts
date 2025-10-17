import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Create a member user account to login with
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(2);

  const createBody = {
    email: memberEmail,
    password: password,
    display_name: displayName,
    confirmation_token: null,
    id: null,
    refresh_token: null,
    version: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    password_hash: null,
    password_confirm: null,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(authorized);

  TestValidator.equals(
    "created member email matches",
    authorized.email,
    memberEmail,
  );
  TestValidator.equals(
    "created member display_name matches",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "has valid access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // 2. Login with the created member credentials
  const loginBody = {
    email: memberEmail,
    password: password,
  } satisfies IDiscussionBoardMember.ILogin;

  const loginAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  TestValidator.equals(
    "login member email matches",
    loginAuthorized.email,
    memberEmail,
  );
  TestValidator.equals(
    "login member display_name matches",
    loginAuthorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "login has valid access token",
    typeof loginAuthorized.token.access === "string" &&
      loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has valid refresh token",
    typeof loginAuthorized.token.refresh === "string" &&
      loginAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login has valid expired_at",
    typeof loginAuthorized.token.expired_at === "string" &&
      loginAuthorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login has valid refreshable_until",
    typeof loginAuthorized.token.refreshable_until === "string" &&
      loginAuthorized.token.refreshable_until.length > 0,
  );
}
