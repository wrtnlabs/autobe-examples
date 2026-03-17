import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
  // 1. Join/Create member account with random credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: { email, password },
  });
  typia.assert(loginResult);
  // 3. Validate tokens are different (new session created on login)
  TestValidator.notEquals(
    "login access token differs from join access token",
    joinResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "login refresh token differs from join refresh token",
    joinResult.token.refresh,
    loginResult.token.refresh,
  );
  // 4. Validate date-time format for expiration timestamps
  TestValidator.predicate(
    "access token has valid expired_at format",
    () => !isNaN(Date.parse(joinResult.token.expired_at)),
  );
  TestValidator.predicate(
    "login access token has valid expired_at format",
    () => !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "access token has valid refreshable_until format",
    () => !isNaN(Date.parse(joinResult.token.refreshable_until)),
  );
  TestValidator.predicate(
    "login access token has valid refreshable_until format",
    () => !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 5. Validate that refreshable_until is in the future
  TestValidator.predicate(
    "login refreshable_until is in the future",
    () => new Date(loginResult.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "join refreshable_until is in the future",
    () => new Date(joinResult.token.refreshable_until) > new Date(),
  );
}
