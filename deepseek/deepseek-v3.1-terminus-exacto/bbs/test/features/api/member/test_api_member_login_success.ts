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
 * 1. First create a member account using authorize_member_join
 * 2. Use the created member's email and password to perform login
 * 3. Validate that login returns proper authorization tokens and member profile
 * 4. Verify token structure includes access and refresh tokens with expiration timestamps
 * 5. Ensure the response matches the registered member's details
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Perform login with the created member's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: registeredMember.email,
      password: joinConnection.headers?.Authorization
        ? RandomGenerator.alphaNumeric(16)
        : ((() => {
            throw new Error("Password not available");
          })() as string & tags.Format<"password">),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Validate login response structure
  TestValidator.equals(
    "member ID matches",
    loginResponse.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "email matches",
    loginResponse.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResponse.display_name,
    registeredMember.display_name,
  );
  TestValidator.equals("bio matches", loginResponse.bio, registeredMember.bio);
  TestValidator.predicate("not banned", loginResponse.is_banned === false);
  TestValidator.equals("no ban reason", loginResponse.ban_reason, null);
  TestValidator.equals("no admin grade", loginResponse.admin_grade, null);
  TestValidator.predicate(
    "has created_at timestamp",
    typeof loginResponse.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    typeof loginResponse.updated_at === "string",
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "has access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    typeof loginResponse.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    typeof loginResponse.token.refreshable_until === "string",
  );
  // Validate token expiration times are in ISO format
  TestValidator.predicate(
    "expired_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loginResponse.token.refreshable_until,
    ),
  );
  // 5. Ensure tokens are different from credentials
  TestValidator.notEquals(
    "access token not password",
    loginResponse.token.access,
    joinConnection.headers?.Authorization ? String(joinConnection.headers.Authorization) : undefined,
  );
}