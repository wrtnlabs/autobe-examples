import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
 * Test case-insensitive username lookup for member profile retrieval.
 *
 * This test verifies that the member profile endpoint performs case-insensitive
 * lookup on the username while preserving the original case from the database.
 *
 * Setup: Create a member account with a mixed-case username (e.g., 'JohnDoe').
 * Execute: Call GET /community/members/{memberUsername} with the same username
 * but in different cases (lowercase 'johndoe', uppercase 'JOHNDOE').
 * Verify: Response contains the correct profile with original case preserved.
 */
export async function test_api_member_profile_case_insensitive_lookup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member with a mixed-case username
  const memberConnection: api.IConnection = { host: connection.host };
  const originalUsername = "JohnDoe";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      username: originalUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorized);
  // 2. Test lowercase lookup - should return same member
  const lowerCaseProfile =
    await api.functional.community.members.getByMemberusername(connection, {
      memberUsername: originalUsername.toLowerCase(),
    });
  typia.assert(lowerCaseProfile);
  // Verify: Username preserves original case from database
  TestValidator.equals(
    "lowercase lookup preserves original case",
    lowerCaseProfile.username,
    originalUsername,
  );
  TestValidator.equals(
    "lowercase lookup returns correct member id",
    lowerCaseProfile.id,
    authorized.id,
  );
  // 3. Test uppercase lookup - should return same member
  const upperCaseProfile =
    await api.functional.community.members.getByMemberusername(connection, {
      memberUsername: originalUsername.toUpperCase(),
    });
  typia.assert(upperCaseProfile);
  // Verify: Username preserves original case from database
  TestValidator.equals(
    "uppercase lookup preserves original case",
    upperCaseProfile.username,
    originalUsername,
  );
  TestValidator.equals(
    "uppercase lookup returns correct member id",
    upperCaseProfile.id,
    authorized.id,
  );
  // 4. Test mixed case lookup (different from original) - should return same member
  const mixedCaseProfile =
    await api.functional.community.members.getByMemberusername(connection, {
      memberUsername: "jOhNdOe",
    });
  typia.assert(mixedCaseProfile);
  // Verify: Username preserves original case from database
  TestValidator.equals(
    "mixed case lookup preserves original case",
    mixedCaseProfile.username,
    originalUsername,
  );
  TestValidator.equals(
    "mixed case lookup returns correct member id",
    mixedCaseProfile.id,
    authorized.id,
  );
  // 5. Verify all profile fields are returned correctly
  TestValidator.predicate(
    "has karma field",
    typeof mixedCaseProfile.karma === "number",
  );
  TestValidator.predicate(
    "has created_at field",
    typeof mixedCaseProfile.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at field",
    typeof mixedCaseProfile.updated_at === "string",
  );
}
