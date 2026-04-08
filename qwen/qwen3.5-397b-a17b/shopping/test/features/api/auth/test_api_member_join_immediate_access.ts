import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that newly registered member can immediately access authenticated member features.
 *
 * Validates the complete member registration flow including account creation, JWT token generation, and immediate authentication capability. Ensures that the join operation returns valid credentials that grant instant access to protected member operations without requiring a separate login step.
 *
 * Special attention is given to verifying that the authorization token contains both access and refresh tokens with proper expiration timestamps, and that the member account information is complete with active status.
 *
 * 1. Register new member with unique email and password credentials.
 * 2. Validate the authorized response contains complete member information.
 * 3. Verify authorization token has valid access and refresh tokens.
 * 4. Confirm member account status is active for immediate access.
 * 5. Validate token expiration timestamps are properly set.
 */
export async function test_api_member_join_immediate_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register new member using utility function
  const authorized = await authorize_member_join(connection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // 3. Validate member account information
  TestValidator.equals("email matches input", authorized.email, joinEmail);
  TestValidator.equals("status is active", authorized.status, "active");
  TestValidator.predicate(
    "deleted_at is null for active account",
    authorized.deleted_at === null,
  );
  // 4. Verify token expiration timestamps are valid and logical
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
  // 5. Verify access token is set in connection headers for immediate use
  TestValidator.predicate(
    "connection has authorization header",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    connection.headers?.Authorization,
    authorized.token.access,
  );
}