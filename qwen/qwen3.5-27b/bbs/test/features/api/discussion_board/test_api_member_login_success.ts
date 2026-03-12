import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test successful member login with valid credentials.
 *
 * This test validates the complete member authentication workflow:
 * 1. Register a new member account
 * 2. Login with the registered credentials
 * 3. Verify the authentication response contains valid tokens and member data
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for member registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  // 2. Create a new member account with generated credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 3. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: email,
      password: password,
    },
  });
  typia.assert(loginResult);
  // 4. Validate the login response contains expected data
  TestValidator.equals(
    "login returns same member ID as join",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate("member is not banned", loginResult.banned === false);
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has valid expiration",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid deadline",
    loginResult.token.refreshable_until.length > 0,
  );
}
