import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member account registration with valid credentials.
 *
 * This test verifies the complete member registration workflow:
 * 1. Generate unique member credentials (email, password, display_name)
 * 2. Register new member using authorize_member_join utility
 * 3. Validate response contains complete member profile
 * 4. Validate JWT authentication tokens are present and valid
 * 5. Confirm member is immediately authenticated for platform access
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        display_name: displayName,
        avatar_image: typia.random<string & tags.Format<"uri">>(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  // Validate complete response structure
  typia.assert(authorized);
  // Verify member profile data matches input
  TestValidator.equals("email matches registration", authorized.email, email);
  TestValidator.equals(
    "display name matches",
    authorized.display_name,
    displayName,
  );
  // Verify member account is active (not deleted)
  TestValidator.equals("account is active", authorized.deleted_at, null);
  // Verify timestamps exist and are valid date-time format
  TestValidator.predicate(
    "created_at exists",
    authorized.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    authorized.updated_at !== undefined,
  );
  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date",
    authorized.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    authorized.token.refreshable_until !== undefined,
  );
  // Verify refresh token expires after access token
  const accessExpiry = new Date(authorized.token.expired_at).getTime();
  const refreshExpiry = new Date(authorized.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh expires after access",
    refreshExpiry >= accessExpiry,
  );
  // Verify member connection has been updated with authorization token
  TestValidator.predicate(
    "connection has auth header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
