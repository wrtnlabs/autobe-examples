import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Prepare unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphaNumeric(12);
  // 2. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      username,
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joined);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityMember.ILogin,
  });
  typia.assert(loggedIn);
  // 4. Validate token fields are non-empty
  TestValidator.predicate(
    "access token non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loggedIn.token.refresh.length > 0,
  );
  // 5. Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is further than expired_at",
    refreshableUntil >= expiredAt,
  );
  // 6. Validate member identity fields match registration
  TestValidator.equals("id matches joined member", loggedIn.id, joined.id);
  TestValidator.equals("username matches", loggedIn.username, username);
  TestValidator.equals("email matches", loggedIn.email, email);
  // 7. Validate karma score is 0 for freshly registered member
  TestValidator.equals("karma_score is 0", loggedIn.karma_score, 0);
}
