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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random valid credentials for member registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(1);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email,
    username,
    password,
    displayName,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href,
    referrer,
    ip,
  } satisfies IRedditPlatformMember.IJoin;
  // 2. Create member account via registration with actor-specific connection
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  // 3. Login with the same credentials using separate connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IRedditPlatformMember.ILogin;
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 4. Verify JWT access token format (3 base64url segments separated by dots)
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  TestValidator.predicate(
    "access token is valid JWT format",
    jwtRegex.test(loginResult.access),
  );
  // 5. Verify refresh token is non-empty string
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResult.refresh.length > 0,
  );
  // 6. Verify token expiration timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "expired_at is valid ISO 8601 format",
    !isNaN(Date.parse(loginResult.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 format",
    !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 7. Verify access token expires in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loginResult.expired_at) > new Date(),
  );
  // 8. Verify refreshable_until expires later than expired_at (2-hour window)
  const accessExpires = new Date(loginResult.expired_at);
  const refreshExpires = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshExpires > accessExpires,
  );
  // 9. Verify user profile summary fields are populated
  TestValidator.notEquals("user id is present", loginResult.user.id, null);
  TestValidator.notEquals(
    "username is present",
    loginResult.user.username,
    null,
  );
  TestValidator.notEquals(
    "display_name is present",
    loginResult.user.display_name,
    null,
  );
  TestValidator.predicate(
    "karma_score is non-negative",
    loginResult.user.karma_score >= 0,
  );
  TestValidator.predicate(
    "is_active is true",
    loginResult.user.is_active === true,
  );
  // 10. Verify main response fields match user profile
  TestValidator.equals(
    "response id matches user summary id",
    loginResult.id,
    loginResult.user.id,
  );
  TestValidator.equals(
    "response username matches user summary username",
    loginResult.username,
    loginResult.user.username,
  );
  TestValidator.equals(
    "response display_name matches user summary",
    loginResult.display_name,
    loginResult.user.display_name,
  );
  // 11. Verify sessions array has at least one entry
  TestValidator.predicate(
    "at least one session was created",
    loginResult.sessions.length >= 1,
  );
  // 12. Validate session structure
  if (loginResult.sessions.length > 0) {
    const session = loginResult.sessions[0];
    typia.assert(session);
    TestValidator.notEquals("session id is present", session.id, null);
    TestValidator.notEquals(
      "session member id is present",
      session.member.id,
      null,
    );
    TestValidator.notEquals(
      "session expired_at is present",
      session.expired_at,
      null,
    );
    TestValidator.predicate(
      "session expired_at is in the future",
      new Date(session.expired_at) > new Date(),
    );
  }
  // 13. Verify optional profile fields can be null
  TestValidator.equals("avatar_url can be null", loginResult.avatar_url, null);
  TestValidator.equals("bio can be null", loginResult.bio, null);
  // 14. Verify user profile summary contains all required fields
  TestValidator.predicate(
    "user summary id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.user.id,
    ),
  );
  TestValidator.predicate(
    "user summary username length is 3-20 characters",
    loginResult.user.username.length >= 3 &&
      loginResult.user.username.length <= 20,
  );
  TestValidator.predicate(
    "user summary karma_score is valid int32",
    loginResult.user.karma_score >= -2147483648 &&
      loginResult.user.karma_score <= 2147483647,
  );
}
