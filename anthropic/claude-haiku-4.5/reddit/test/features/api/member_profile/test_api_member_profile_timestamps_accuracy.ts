import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test member profile timestamp accuracy and ISO 8601 formatting.
 *
 * This test validates that member profile timestamps (created_at and
 * updated_at) are accurate, properly formatted in ISO 8601 standard, and
 * consistent with the member account lifecycle. The test creates a new member
 * account, retrieves their profile, and validates that both timestamps are
 * present, correctly formatted, and represent the actual creation and update
 * times.
 *
 * Steps:
 *
 * 1. Create a new member account through registration endpoint
 * 2. Extract the member ID from the authorization response
 * 3. Retrieve the member's profile using the profile endpoint
 * 4. Validate that created_at timestamp is in ISO 8601 format
 * 5. Validate that updated_at timestamp is in ISO 8601 format
 * 6. Verify created_at and updated_at are equal on initial profile creation
 * 7. Verify the profile contains complete member information
 * 8. Confirm all timestamp values are consistent and accurate
 */
export async function test_api_member_profile_timestamps_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const password = `Secure${RandomGenerator.alphaNumeric(6)}@123`;

  const memberCreation = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      username: username,
      password: password,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreation);
  typia.assert(memberCreation.id);

  // Step 2: Extract the member ID
  const memberId = memberCreation.id;

  // Step 3: Retrieve the member's profile
  const profile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.members.profiles.at(connection, {
      memberId: memberId,
    });
  typia.assert(profile);

  // Step 4: Validate that created_at is in ISO 8601 format
  TestValidator.predicate(
    "created_at is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(profile.created_at),
  );

  // Step 5: Validate that updated_at is in ISO 8601 format
  TestValidator.predicate(
    "updated_at is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(profile.updated_at),
  );

  // Step 6: Verify created_at and updated_at are equal on initial creation
  TestValidator.equals(
    "created_at equals updated_at on initial profile creation",
    profile.created_at,
    profile.updated_at,
  );

  // Step 7: Verify the profile contains complete member information
  typia.assert(profile.member);
  TestValidator.equals(
    "profile member ID matches created member ID",
    profile.community_platform_member_id,
    memberId,
  );

  TestValidator.equals(
    "profile member username matches registration username",
    profile.member.username,
    username,
  );

  TestValidator.equals(
    "profile member email matches registration email",
    profile.member.email,
    email,
  );

  // Step 8: Verify timestamps are valid Date objects when parsed
  const createdAtDate = new Date(profile.created_at);
  const updatedAtDate = new Date(profile.updated_at);

  TestValidator.predicate(
    "created_at parses to valid Date",
    !isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "updated_at parses to valid Date",
    !isNaN(updatedAtDate.getTime()),
  );

  // Verify timestamps are recent (within last minute to account for server time)
  const now = Date.now();
  const createdAtTime = createdAtDate.getTime();
  const updatedAtTime = updatedAtDate.getTime();
  const oneMinuteMs = 60000;

  TestValidator.predicate(
    "created_at timestamp is recent (within 1 minute)",
    now - createdAtTime >= 0 && now - createdAtTime <= oneMinuteMs,
  );

  TestValidator.predicate(
    "updated_at timestamp is recent (within 1 minute)",
    now - updatedAtTime >= 0 && now - updatedAtTime <= oneMinuteMs,
  );
}
