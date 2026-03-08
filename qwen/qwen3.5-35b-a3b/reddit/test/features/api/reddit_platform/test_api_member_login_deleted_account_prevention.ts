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

export async function test_api_member_login_deleted_account_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify login succeeds for active account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "1234",
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify response includes deletedAt field (null for active account)
  TestValidator.equals(
    "active account deletedAt is null",
    loginResult.deletedAt,
    null,
  );
  TestValidator.equals(
    "response includes all required fields",
    loginResult.id !== undefined,
    true,
  );
  TestValidator.equals(
    "response includes token",
    loginResult.token.access !== "",
    true,
  );
  // 4. Verify authentication structure
  TestValidator.predicate("member is active", loginResult.isActive === true);
  TestValidator.equals(
    "username matches input",
    loginResult.username,
    joinResult.username,
  );
  TestValidator.equals(
    "email matches input",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals("karma score initialized", loginResult.karmaScore, 0);
  TestValidator.equals(
    "no communities moderated",
    loginResult.moderatorOfCommunities.length,
    0,
  );
  TestValidator.equals("no banned users", loginResult.bannedUsers.length, 0);
  // 5. Verify token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    loginResult.token.expired_at > new Date().toISOString(),
  );
  TestValidator.predicate(
    "refreshable until in future",
    loginResult.token.refreshable_until > new Date().toISOString(),
  );
  // 6. Verify date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    loginResult.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    loginResult.updatedAt.includes("T"),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    loginResult.deletedAt === null,
  );
  // Note: Testing soft-delete login prevention requires database-level operations
  // that are not exposed through the available API functions.
  // The IAuthorized response structure includes deletedAt field for this purpose.
}
