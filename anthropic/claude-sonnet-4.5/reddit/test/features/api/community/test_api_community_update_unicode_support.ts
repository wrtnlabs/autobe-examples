import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that community updates properly support Unicode characters in
 * display_title and description fields for international communities.
 *
 * This test validates the platform's internationalization capabilities by
 * verifying that:
 *
 * 1. A moderator can register and authenticate successfully
 * 2. A community can be created with standard ASCII content
 * 3. The community can be updated with Unicode characters from various language
 *    systems
 * 4. The system correctly stores and retrieves Unicode content without corruption
 * 5. Multiple language scripts (Chinese, Arabic, Emoji) are properly supported
 *
 * Test workflow:
 *
 * 1. Register a moderator account
 * 2. Create a test community with ASCII content
 * 3. Update display_title with Unicode characters (Chinese, Arabic, Emoji)
 * 4. Update description with international Unicode content
 * 5. Retrieve the updated community and verify Unicode integrity
 */
export async function test_api_community_update_unicode_support(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account for community management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community with standard ASCII content
  const communityName = RandomGenerator.alphabets(10);
  const initialCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: "Test Community",
          description: "A test community for Unicode support validation",
          rules: "Follow platform guidelines",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);

  // Step 3: Prepare Unicode update data with multiple language systems
  const unicodeDisplayTitle = "国际社区 🌍 المجتمع الدولي 🎉";
  const unicodeDescription =
    "欢迎来到我们的国际社区 Welcome to our international community مرحبا بكم في مجتمعنا الدولي 🌐💻 " +
    "支持多语言 Multi-language support دعم متعدد اللغات ✨🚀";

  // Step 4: Update the community with Unicode content
  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: initialCommunity.id,
        body: {
          display_title: unicodeDisplayTitle,
          description: unicodeDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 5: Validate that Unicode characters are correctly stored and retrieved
  TestValidator.equals(
    "Unicode display_title stored correctly",
    updatedCommunity.display_title,
    unicodeDisplayTitle,
  );

  TestValidator.equals(
    "Unicode description stored correctly",
    updatedCommunity.description,
    unicodeDescription,
  );

  // Step 6: Verify that the community ID and immutable name remain unchanged
  TestValidator.equals(
    "Community ID unchanged after update",
    updatedCommunity.id,
    initialCommunity.id,
  );

  TestValidator.equals(
    "Community name unchanged after update",
    updatedCommunity.name,
    initialCommunity.name,
  );

  // Step 7: Validate specific Unicode character presence
  TestValidator.predicate(
    "Display title contains Chinese characters",
    updatedCommunity.display_title.includes("国际社区"),
  );

  TestValidator.predicate(
    "Display title contains Arabic characters",
    updatedCommunity.display_title.includes("المجتمع الدولي"),
  );

  TestValidator.predicate(
    "Display title contains emoji",
    updatedCommunity.display_title.includes("🌍") &&
      updatedCommunity.display_title.includes("🎉"),
  );

  TestValidator.predicate(
    "Description contains mixed language content",
    updatedCommunity.description.includes("欢迎来到我们的国际社区") &&
      updatedCommunity.description.includes("مرحبا بكم في مجتمعنا الدولي") &&
      updatedCommunity.description.includes("🌐💻"),
  );
}
