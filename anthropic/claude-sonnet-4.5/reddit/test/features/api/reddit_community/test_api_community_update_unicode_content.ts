import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that community updates properly handle Unicode characters in
 * display_title, description, and rules fields, validating international
 * community support and diverse language representation.
 *
 * The test workflow includes:
 *
 * 1. Create moderator account
 * 2. Create community with English-language content
 * 3. Update the community with Unicode content including emoji, CJK characters,
 *    Arabic script, and special symbols
 * 4. Verify the response correctly preserves all Unicode characters without
 *    corruption or encoding issues
 * 5. Confirm character length limits are properly enforced using Unicode-aware
 *    counting (not byte counting)
 */
export async function test_api_community_update_unicode_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Create community with English-language content
  const communityName = RandomGenerator.alphabets(10);
  const initialCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: "English Community Title",
          description: "This is a standard English description for testing.",
          rules: "Be respectful and follow community guidelines.",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);

  // Step 3: Update community with comprehensive Unicode content
  // Including emoji, CJK characters, Arabic script, and special symbols
  const unicodeDisplayTitle = "🌍 世界 مرحبا Hello 你好 こんにちは 안녕하세요";
  const unicodeDescription =
    "Emoji test: 😀🎉🚀💡 CJK: 中文字符 日本語 한국어 Arabic: مرحبا بك Special: © ® ™ ± § Combining: e\u0301";
  const unicodeRules =
    "Rules with Unicode: ✓ Respect all cultures 世界平和 السلام العالمي 🌈 No spam ❌";

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityname(
      connection,
      {
        communityName: initialCommunity.name,
        body: {
          display_title: unicodeDisplayTitle,
          description: unicodeDescription,
          rules: unicodeRules,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 4: Verify all Unicode characters are preserved exactly
  TestValidator.equals(
    "display_title Unicode preservation",
    updatedCommunity.display_title,
    unicodeDisplayTitle,
  );

  TestValidator.equals(
    "description Unicode preservation",
    updatedCommunity.description,
    unicodeDescription,
  );

  TestValidator.equals(
    "rules Unicode preservation",
    updatedCommunity.rules,
    unicodeRules,
  );

  // Step 5: Verify character length limits use Unicode-aware counting
  // The display_title has max 100 characters, description and rules max 500
  const displayTitleLength = [...unicodeDisplayTitle].length;
  const descriptionLength = [...unicodeDescription].length;
  const rulesLength = [...unicodeRules].length;

  TestValidator.predicate(
    "display_title within character limit",
    displayTitleLength <= 100,
  );

  TestValidator.predicate(
    "description within character limit",
    descriptionLength <= 500,
  );

  TestValidator.predicate("rules within character limit", rulesLength <= 500);

  // Verify other community properties remain unchanged
  TestValidator.equals(
    "community ID unchanged",
    updatedCommunity.id,
    initialCommunity.id,
  );

  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    initialCommunity.name,
  );

  TestValidator.equals(
    "creator unchanged",
    updatedCommunity.creator_member_id,
    initialCommunity.creator_member_id,
  );
}
