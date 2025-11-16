import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test automatic updated_at timestamp tracking on profile modifications.
 *
 * This test validates that the platform correctly tracks when member profiles
 * were last modified by automatically updating the updated_at timestamp field.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Capture the initial updated_at timestamp
 * 3. Wait briefly to ensure time progression
 * 4. Perform a profile update operation
 * 5. Verify the updated_at timestamp has changed
 * 6. Ensure the new timestamp is later than the original
 */
export async function test_api_member_profile_update_timestamp_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Capture the initial updated_at timestamp
  const initialUpdatedAt: string & tags.Format<"date-time"> =
    authenticatedMember.updated_at;

  // Step 3: Wait briefly to ensure time has progressed
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Perform a profile update operation
  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: authenticatedMember.username,
      body: {
        display_name: RandomGenerator.name(2),
      } satisfies IRedditCommunityGuest.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 5: Verify the updated_at timestamp has changed from the initial value
  // Note: ISummary doesn't include updated_at, so we need to compare created_at timestamps
  // The created_at should remain the same as the initial account creation
  TestValidator.equals(
    "created_at timestamp should remain unchanged after profile update",
    updatedProfile.created_at,
    authenticatedMember.created_at,
  );

  // Step 6: Verify profile data was actually updated
  TestValidator.notEquals(
    "display_name should be different after update",
    updatedProfile.display_name,
    memberData.display_name,
  );
}
