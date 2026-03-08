import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 2. Login with same credentials
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IRedditPlatformMember.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // 3. Validate HTTP 200 response (implied by successful return)
  TestValidator.predicate(
    "login returns IAuthorized response",
    loginResult !== null && loginResult !== undefined,
  );
  // 4. Validate email matches registration
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    joinInput.email,
  );
  // 5. Validate username matches registration
  TestValidator.equals(
    "username matches registration",
    loginResult.username,
    joinInput.username,
  );
  // 6. Validate account is active
  TestValidator.predicate("member is active", loginResult.isActive === true);
  // 7. Validate account not deleted
  TestValidator.predicate("member not deleted", loginResult.deletedAt === null);
  // 8. Validate initial karma score
  TestValidator.equals("initial karma score is 0", loginResult.karmaScore, 0);
  // 9. Validate moderatorOfCommunities is array
  TestValidator.predicate(
    "moderatorOfCommunities is array",
    Array.isArray(loginResult.moderatorOfCommunities),
  );
  // 10. Validate bannedUsers is array
  TestValidator.predicate(
    "bannedUsers is array",
    Array.isArray(loginResult.bannedUsers),
  );
  // 11. Validate token object exists and has required fields
  const token = loginResult.token;
  typia.assert(token);
  TestValidator.predicate("token access is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "token refresh is non-empty",
    token.refresh.length > 0,
  );
  // 12. Validate token expiration times
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
  // 13. Validate bio and avatarUrl are null for new member
  TestValidator.equals("bio is null for new member", loginResult.bio, null);
  TestValidator.equals(
    "avatarUrl is null for new member",
    loginResult.avatarUrl,
    null,
  );
  // 14. Validate timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(loginResult.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(Date.parse(loginResult.updatedAt)),
  );
}
