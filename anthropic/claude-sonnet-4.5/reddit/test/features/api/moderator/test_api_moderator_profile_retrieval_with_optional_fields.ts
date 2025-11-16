import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieving moderator profiles with various combinations of optional
 * fields populated or null.
 *
 * This scenario ensures the API correctly handles nullable fields like
 * display_name, bio, avatar_url, and deleted_at. Create multiple moderator
 * accounts with different optional field configurations and retrieve each
 * profile to verify that null values are properly represented and that the
 * response structure remains consistent regardless of which optional fields are
 * present.
 *
 * Steps:
 *
 * 1. Create moderator with all optional fields populated (if API supports it
 *    during creation)
 * 2. Create moderator with minimal information (only required fields)
 * 3. Create moderator with partial optional data
 * 4. Retrieve each profile via GET endpoint
 * 5. Verify response structure consistency across all profiles
 * 6. Validate that optional fields are properly represented (null/undefined or
 *    actual values)
 * 7. Ensure required fields are always present and valid
 */
export async function test_api_moderator_profile_retrieval_with_optional_fields(
  connection: api.IConnection,
) {
  // Create moderator 1: Standard profile (API join endpoint determines what fields get populated)
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator1);

  // Retrieve profile 1
  const profile1 = await api.functional.redditCommunity.moderators.profile.at(
    connection,
    {
      username: moderator1.username,
    },
  );
  typia.assert(profile1);

  // Verify profile 1 required fields
  TestValidator.equals(
    "profile1 username matches",
    profile1.username,
    moderator1.username,
  );
  TestValidator.equals(
    "profile1 email matches",
    profile1.email,
    moderator1.email,
  );
  TestValidator.equals("profile1 id matches", profile1.id, moderator1.id);
  TestValidator.predicate(
    "profile1 has valid created_at",
    typeof profile1.created_at === "string",
  );
  TestValidator.predicate(
    "profile1 has valid updated_at",
    typeof profile1.updated_at === "string",
  );
  TestValidator.predicate(
    "profile1 has post_karma",
    typeof profile1.post_karma === "number",
  );
  TestValidator.predicate(
    "profile1 has comment_karma",
    typeof profile1.comment_karma === "number",
  );
  TestValidator.predicate(
    "profile1 has email_verified",
    typeof profile1.email_verified === "boolean",
  );

  // Create moderator 2: Another standard profile
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "anotherPass456!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator2);

  // Retrieve profile 2
  const profile2 = await api.functional.redditCommunity.moderators.profile.at(
    connection,
    {
      username: moderator2.username,
    },
  );
  typia.assert(profile2);

  // Verify profile 2 structure consistency
  TestValidator.equals(
    "profile2 username matches",
    profile2.username,
    moderator2.username,
  );
  TestValidator.equals(
    "profile2 email matches",
    profile2.email,
    moderator2.email,
  );
  TestValidator.predicate(
    "profile2 has valid timestamps",
    typeof profile2.created_at === "string" &&
      typeof profile2.updated_at === "string",
  );

  // Create moderator 3
  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "thirdPass789!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator3);

  // Retrieve profile 3
  const profile3 = await api.functional.redditCommunity.moderators.profile.at(
    connection,
    {
      username: moderator3.username,
    },
  );
  typia.assert(profile3);

  // Verify profile 3 consistency
  TestValidator.equals("profile3 id matches", profile3.id, moderator3.id);
  TestValidator.predicate(
    "profile3 has karma fields",
    typeof profile3.post_karma === "number" &&
      typeof profile3.comment_karma === "number",
  );

  // Verify all profiles have consistent structure with privacy settings
  TestValidator.predicate(
    "profile1 has show_online_status",
    typeof profile1.show_online_status === "boolean",
  );
  TestValidator.predicate(
    "profile1 has show_subscribed_communities",
    typeof profile1.show_subscribed_communities === "boolean",
  );
  TestValidator.predicate(
    "profile1 has show_activity_feed",
    typeof profile1.show_activity_feed === "boolean",
  );

  TestValidator.predicate(
    "profile2 has show_online_status",
    typeof profile2.show_online_status === "boolean",
  );
  TestValidator.predicate(
    "profile2 has show_subscribed_communities",
    typeof profile2.show_subscribed_communities === "boolean",
  );
  TestValidator.predicate(
    "profile2 has show_activity_feed",
    typeof profile2.show_activity_feed === "boolean",
  );

  TestValidator.predicate(
    "profile3 has show_online_status",
    typeof profile3.show_online_status === "boolean",
  );
  TestValidator.predicate(
    "profile3 has show_subscribed_communities",
    typeof profile3.show_subscribed_communities === "boolean",
  );
  TestValidator.predicate(
    "profile3 has show_activity_feed",
    typeof profile3.show_activity_feed === "boolean",
  );

  // Verify deleted_at is null or undefined for active accounts (not deleted)
  TestValidator.predicate(
    "profile1 deleted_at is null or undefined",
    profile1.deleted_at === null || profile1.deleted_at === undefined,
  );
  TestValidator.predicate(
    "profile2 deleted_at is null or undefined",
    profile2.deleted_at === null || profile2.deleted_at === undefined,
  );
  TestValidator.predicate(
    "profile3 deleted_at is null or undefined",
    profile3.deleted_at === null || profile3.deleted_at === undefined,
  );
}
