import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_then_login(
  connection: api.IConnection,
): Promise<void> {
  // Generate join credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Admin registration (join)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
      displayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Admin login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate token structure
  // Both responses contain IEconomicPoliticalBoardAdmin.IAuthorized with id and token
  TestValidator.equals("join id exists", joinResult.id !== undefined, true);
  TestValidator.equals("login id exists", loginResult.id !== undefined, true);
  // Validate token timestamps are valid ISO 8601 format
  const joinExpiredAt = new Date(joinResult.token.expired_at);
  const joinRefreshableUntil = new Date(joinResult.token.refreshable_until);
  const loginExpiredAt = new Date(loginResult.token.expired_at);
  const loginRefreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "join expired_at is valid date",
    !isNaN(joinExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "join refreshable_until is valid date",
    !isNaN(joinRefreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "login expired_at is valid date",
    !isNaN(loginExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "login refreshable_until is valid date",
    !isNaN(loginRefreshableUntil.getTime()),
  );
  // Validate session establishment - access tokens are present
  TestValidator.equals(
    "join has access token",
    joinResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "login has access token",
    loginResult.token.access.length > 0,
    true,
  );
  // Validate refresh tokens are present
  TestValidator.equals(
    "join has refresh token",
    joinResult.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "login has refresh token",
    loginResult.token.refresh.length > 0,
    true,
  );
}
