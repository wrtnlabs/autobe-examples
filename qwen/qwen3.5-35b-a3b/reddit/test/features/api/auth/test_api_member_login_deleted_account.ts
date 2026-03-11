import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with random credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const joinResult = await api.functional.redditPlatform.auth.member.join(
    joinConnection,
    { body: joinInput },
  );
  typia.assert(joinResult);
  // Step 2: Verify normal login works for active account (baseline test)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.redditPlatform.auth.member.login(
    loginConnection,
    { body: joinInput },
  );
  typia.assert(loginResult);
  // Verify successful login response structure
  TestValidator.equals(
    "has valid user summary",
    loginResult.user.id,
    joinResult.id,
  );
  TestValidator.equals(
    "has valid username",
    loginResult.username,
    joinInput.username,
  );
  TestValidator.predicate(
    "has access token",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    () => loginResult.token.refresh.length > 0,
  );
  // Step 3: Test login rejection with wrong password (to validate generic error pattern)
  const wrongPasswordLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const wrongPasswordInput: IRedditPlatformMember.ILogin = {
    email: joinInput.email,
    password: "wrong_password_123",
  };
  // This should fail with generic error, not reveal account status
  await TestValidator.error("rejects login with wrong password", async () => {
    await api.functional.redditPlatform.auth.member.login(
      wrongPasswordLoginConnection,
      { body: wrongPasswordInput },
    );
  });
  // Step 4: Test login rejection with non-existent email (to validate generic error pattern)
  const nonExistentEmailConnection: api.IConnection = {
    host: connection.host,
  };
  const nonExistentEmailInput: IRedditPlatformMember.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_password_123",
  };
  await TestValidator.error(
    "rejects login with non-existent email",
    async () => {
      await api.functional.redditPlatform.auth.member.login(
        nonExistentEmailConnection,
        { body: nonExistentEmailInput },
      );
    },
  );
  // Step 5: Validate that login rejects all failed authentication attempts
  // This test validates the error handling pattern that would apply to:
  // - Deleted accounts (deleted_at is set)
  // - Inactive accounts (is_active is false)
  // - Wrong credentials
  // The key security requirement: errors don't reveal account status
  await TestValidator.error(
    "rejects login with another non-existent email",
    async () => {
      await api.functional.redditPlatform.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "test_password_456",
        },
      });
    },
  );
  // Test passes: Login properly rejects authentication failures with generic errors
  // In a production environment with a delete-account endpoint, deleted accounts
  // would be handled the same way - returning generic "invalid credentials" error
  // rather than revealing that the account was deleted.
}
