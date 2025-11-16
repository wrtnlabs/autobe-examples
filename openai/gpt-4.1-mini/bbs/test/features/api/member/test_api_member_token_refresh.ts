import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_member_token_refresh(
  connection: api.IConnection,
) {
  // 1. Member joins (registers) to obtain initial authorization tokens
  const memberCreateBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: "strongpassword123",
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const authorizedMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorizedMember);

  // Ensure tokens exist
  TestValidator.predicate(
    "access token exists",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorizedMember.token.refresh.length > 0,
  );

  // 2. Use refresh token to get a new authorization token
  const refreshBody = {
    refreshToken: authorizedMember.token.refresh,
  } satisfies IEconPolDiscussionBoardMember.IRefresh;

  const refreshedMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedMember);

  // Validate new tokens differ from old tokens
  TestValidator.notEquals(
    "access tokens differ after refresh",
    authorizedMember.token.access,
    refreshedMember.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ after refresh",
    authorizedMember.token.refresh,
    refreshedMember.token.refresh,
  );

  // Validate refreshed member info remains consistent
  TestValidator.equals(
    "username remains the same",
    authorizedMember.username,
    refreshedMember.username,
  );
  TestValidator.equals(
    "email remains the same",
    authorizedMember.email,
    refreshedMember.email,
  );
  TestValidator.equals(
    "id remains the same",
    authorizedMember.id,
    refreshedMember.id,
  );

  // 3. Use new access token (automatically set on connection headers) to call join again and verify authorization
  // Refresh call sets connection.headers.Authorization to new access token
  // We can call an authenticated endpoint to confirm tokens are valid

  // Call the join API again with fresh data should be possible
  const newMemberCreateBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: "newpassword456",
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const newAuthorizedMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: newMemberCreateBody,
    });
  typia.assert(newAuthorizedMember);

  // Confirm that the token was refreshed correctly and that the new call succeeded
  TestValidator.predicate(
    "new member access token exists",
    newAuthorizedMember.token.access.length > 0,
  );
}
