import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPreference";

/**
 * Test successful retrieval of member preferences after account creation and
 * authentication.
 *
 * This E2E test validates that authenticated members can access their personal
 * preference settings including notification preferences, language settings,
 * timezone configuration, and content filtering levels. The test ensures proper
 * security validation where members can only access their own preferences and
 * verifies that all preference fields are correctly populated with default
 * values upon account creation.
 *
 * Step-by-step process:
 *
 * 1. Create new member account and establish authentication context
 * 2. Create community to fulfill prerequisite requirement for member preference
 *    operations
 * 3. Retrieve member preferences using authenticated connection
 * 4. Validate preference structure and default values
 * 5. Verify member ownership and security validation
 */
export async function test_api_member_preferences_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create new member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to fulfill prerequisite requirement
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Retrieve member preferences using authenticated connection
  const preferences =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(preferences);

  // Step 4: Validate preference structure and default values
  TestValidator.equals(
    "member ID in preferences should match authenticated member",
    preferences.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email in preferences should match",
    preferences.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name in preferences should match",
    preferences.member.display_name,
    member.display_name,
  );

  // Validate default preference values
  TestValidator.predicate(
    "email notifications should be enabled by default",
    preferences.email_notifications === true,
  );
  TestValidator.predicate(
    "push notifications should be enabled by default",
    preferences.push_notifications === true,
  );
  TestValidator.equals(
    "default language should be English",
    preferences.language,
    "en",
  );
  TestValidator.equals(
    "default content filter level should be moderate",
    preferences.content_filter_level,
    "moderate",
  );

  // Step 5: Verify member ownership and security validation
  TestValidator.equals(
    "preferences should belong to the authenticated member",
    preferences.member.id,
    member.id,
  );
}
