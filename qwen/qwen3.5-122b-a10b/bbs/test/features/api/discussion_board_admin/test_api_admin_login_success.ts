import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate business logic - email matches
  TestValidator.equals(
    "email matches input",
    loginResult.email,
    joinResult.email,
  );
  // 4. Validate token expiration times
  const accessExpire = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "access token expires within 15 minutes",
    accessExpire - now <= 15 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expires within 7 days",
    refreshableUntil - now <= 7 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate("access token expires after now", accessExpire > now);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > accessExpire,
  );
}
