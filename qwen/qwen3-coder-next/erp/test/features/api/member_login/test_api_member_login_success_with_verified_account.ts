import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_with_verified_account(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Create member account via join endpoint
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplay = RandomGenerator.name();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplay,
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Simulate email verification to activate account
  // In real scenario, this would involve calling email verification endpoint
  // For this test, we assume the account is automatically activated
  // Step 2: Login with verified account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IHrmTrackerMember.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure and token information
  TestValidator.equals("email matches", loginResponse.email, memberEmail);
  TestValidator.equals(
    "display name matches",
    loginResponse.display_name,
    memberDisplay,
  );
  TestValidator.predicate(
    "status is active",
    loginResponse.status === "active",
  );
  TestValidator.equals(
    "email verified is true",
    loginResponse.email_verified,
    true,
  );
  // Validate token structure
  TestValidator.equals(
    "access token exists",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const now = new Date();
  const accessTokenExpiredAt = new Date(loginResponse.token.expired_at);
  const refreshTokenExpiredAt = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token not expired yet",
    accessTokenExpiredAt > now,
  );
  TestValidator.predicate(
    "refresh token not expired yet",
    refreshTokenExpiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshTokenExpiredAt > accessTokenExpiredAt,
  );
  // Validate member information structure
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
}
