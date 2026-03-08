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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      displayName: testDisplayName,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com/login",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate business logic
  TestValidator.equals("email matches", loginResult.email, testEmail);
  TestValidator.equals(
    "displayName matches",
    loginResult.displayName,
    testDisplayName,
  );
  TestValidator.equals("banned is false", loginResult.banned, false);
  TestValidator.equals("deletedAt is null", loginResult.deletedAt, null);
  // Validate token expiration ordering (business logic, not type validation)
  const accessExpiry = new Date(loginResult.token.expired_at);
  const refreshExpiry = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpiry < refreshExpiry,
  );
}
