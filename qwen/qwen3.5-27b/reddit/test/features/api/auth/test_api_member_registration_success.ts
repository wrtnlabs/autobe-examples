import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration with required credentials.
 *
 * This test validates the complete member registration workflow:
 * 1. Creates a new member account with valid credentials
 * 2. Verifies the authentication response structure
 * 3. Validates that all member fields are properly initialized
 * 4. Confirms JWT tokens are issued correctly
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with unique credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(2),
    bio: null,
    avatar_uri: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  // Execute member registration using utility function
  const member = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // Validate response structure
  typia.assert(member);
  // Verify member fields match expected values
  TestValidator.equals("email matches input", member.email, joinInput.email);
  TestValidator.equals(
    "username matches input",
    member.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches input",
    member.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("bio is null", member.bio, null);
  TestValidator.equals("avatar_uri is null", member.avatar_uri, null);
  TestValidator.equals("karma initialized to zero", member.karma, 0);
  TestValidator.equals("deleted_at is null", member.deleted_at, null);
  // Verify timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.updated_at),
  );
  // Verify token structure
  TestValidator.predicate(
    "access token exists",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.token.refreshable_until),
  );
}
