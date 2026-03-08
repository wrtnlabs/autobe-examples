import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary member registration workflow with valid credentials.
 *
 * A new user registers with a valid email address following RFC 5322 format,
 * a password meeting the minimum 8-character requirement, and a display name
 * between 1-100 characters. The system should validate all input, check email
 * uniqueness, hash the password using bcrypt with cost factor 12, create the
 * member account in the database, generate an email verification token with
 * 24-hour expiration, and return an IAuthorized response containing temporary
 * access tokens.
 *
 * Verify the response includes the member's id, email, displayName, createdAt,
 * updatedAt, deletedAt (null), and token object with access, refresh, expired_at,
 * and refreshable_until fields.
 */
export async function test_api_member_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare valid registration data
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16), // Minimum 8 characters
    displayName: RandomGenerator.name(), // 1-100 characters
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  // Register new member using utility function (has priority over SDK)
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body },
  );
  // Validate response structure (typia.assert performs complete type validation)
  typia.assert(authorized);
  // Verify business logic: email matches input
  TestValidator.equals("email matches input", authorized.email, body.email);
  // Verify business logic: display name length constraint
  TestValidator.predicate(
    "display name within valid range",
    authorized.displayName.length >= 1 && authorized.displayName.length <= 100,
  );
  // Verify business logic: new account is not deleted
  TestValidator.equals(
    "deletedAt is null for new account",
    authorized.deletedAt,
    null,
  );
  // Verify business logic: tokens are present
  TestValidator.predicate(
    "access token present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    authorized.token.refresh.length > 0,
  );
}
