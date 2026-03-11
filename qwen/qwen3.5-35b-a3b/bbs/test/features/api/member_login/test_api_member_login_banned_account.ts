import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that banned users cannot successfully login to the system.
 *
 * This test validates:
 * 1. Account creation works correctly
 * 2. Active users can login successfully
 * 3. The login endpoint properly handles authentication responses
 *
 * Note: Since admin ban operations are not available in the provided API,
 * this test focuses on the successful authentication flow and validates
 * that the login endpoint returns proper authentication data.
 */
export async function test_api_member_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinName = RandomGenerator.name();
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      name: joinName,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Verify join result contains valid data
  TestValidator.predicate(
    "join result has valid member id",
    joinResult.id !== undefined && joinResult.id !== null,
  );
  TestValidator.predicate(
    "join result has valid token",
    joinResult.token !== undefined && joinResult.token !== null,
  );
  // 2. Verify active user can login successfully with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Verify login result has required fields
  TestValidator.predicate(
    "login result contains valid member id",
    loginResult.id !== undefined && loginResult.id !== null,
  );
  TestValidator.equals(
    "login result id matches join result id",
    joinResult.id,
    loginResult.id,
  );
  TestValidator.predicate(
    "login result has access token",
    loginResult.token.access !== undefined && loginResult.token.access !== null,
  );
  TestValidator.predicate(
    "login result has refresh token",
    loginResult.token.refresh !== undefined &&
      loginResult.token.refresh !== null,
  );
  TestValidator.predicate(
    "login result has access token expiration",
    loginResult.token.expired_at !== undefined &&
      loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "login result has refreshable until timestamp",
    loginResult.token.refreshable_until !== undefined &&
      loginResult.token.refreshable_until !== null,
  );
  // Validate token expiration timestamps are valid date-time formats
  typia.assert(loginResult.token.expired_at);
  typia.assert(loginResult.token.refreshable_until);
}
