import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a member's public profile.
 *
 * Validates the complete workflow for creating a member account and retrieving their public profile information. Ensures that the profile endpoint correctly returns only public fields while excluding sensitive data like email addresses and password hashes. The test verifies that all expected public profile data is properly exposed and formatted.
 *
 * Special attention is given to confirming that sensitive fields are never exposed in the public profile response, and that the member can be successfully retrieved using their unique identifier.
 *
 * 1. Create a new member account using authorize_member_join utility function.
 * 2. Capture the member's ID from the join response.
 * 3. Create actor-specific connection for profile retrieval.
 * 4. Call GET /redditPlatform/members/{memberId} with the captured member ID.
 * 5. Validate the response contains valid public profile fields.
 * 6. Verify sensitive fields are NOT present in the response.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account using utility function
  const joinResponse = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  const memberId = joinResponse.id;
  const createdUsername = joinResponse.username;
  // 2. Create actor-specific connection for profile retrieval
  const profileConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve member profile
  const profile = await api.functional.redditPlatform.members.at(
    profileConnection,
    {
      memberId,
    },
  );
  typia.assert(profile);
  // 4. Validate profile contains expected public fields
  TestValidator.equals("profile ID matches requested ID", profile.id, memberId);
  TestValidator.equals(
    "username matches created username",
    profile.username,
    createdUsername,
  );
  TestValidator.predicate(
    "karma is integer type",
    Number.isInteger(profile.karma),
  );
  TestValidator.predicate(
    "karma is int32 range",
    profile.karma >= -2147483648 && profile.karma <= 2147483647,
  );
  // Validate timestamp formats are valid ISO 8601
  const createdAtDate = new Date(profile.created_at);
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(createdAtDate.getTime()),
  );
  const updatedAtDate = new Date(profile.updated_at);
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(updatedAtDate.getTime()),
  );
  // 5. Verify deleted_at is null (active account)
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 6. Verify only public fields are present using type assertion
  // typia.assert(profile) already validates that only IRedditPlatformMember fields exist
  // which excludes sensitive fields like email, password_hash
  // We validate that the structure matches expected public fields
  const publicFields = [
    "id",
    "username",
    "karma",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const actualFields = Object.keys(profile) as string[];
  TestValidator.equals(
    "profile has exactly public fields",
    actualFields.sort(),
    publicFields.sort(),
  );
}
