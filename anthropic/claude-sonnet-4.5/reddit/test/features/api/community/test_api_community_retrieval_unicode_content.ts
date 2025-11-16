import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieval of communities with Unicode and international characters in
 * display_title, description, and rules.
 *
 * This test validates that:
 *
 * 1. Communities created with Unicode characters in display_title are retrieved
 *    correctly
 * 2. Unicode characters in description are preserved and returned accurately
 * 3. Unicode characters in rules are preserved and returned accurately
 * 4. Character encoding is handled properly throughout the request-response cycle
 * 5. International communities display correctly for global users
 *
 * The test creates a community with multi-language Unicode content and verifies
 * that all characters are preserved exactly during the create-retrieve cycle.
 */
export async function test_api_community_retrieval_unicode_content(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain community creation privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123!",
        nickname: "UnicodeTester",
        href: "https://test.reddit.com/register",
        referrer: "https://test.reddit.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with comprehensive Unicode content
  // Use ASCII-safe name for URL compatibility, but Unicode everywhere else
  const unicodeCommunityName = "unicode_test_" + RandomGenerator.alphabets(8);

  // Create multilingual Unicode content
  const unicodeDisplayTitle =
    "🌍 国际社区 • Международное • العالمية • グローバル";
  const unicodeDescription =
    "欢迎来到国际社区! Welcome to the international community! Добро пожаловать! مرحبا بكم! ようこそ! 🎉 This is a test of Unicode support with emoji 😊, CJK characters 中文日本語한국어, Cyrillic Русский, Arabic العربية, and special symbols ©®™€£¥";
  const unicodeRules =
    "规则 Rules Правила:\n1. 尊重他人 Respect others Уважайте других\n2. 禁止垃圾信息 No spam Нет спама\n3. 使用适当的语言 Use appropriate language Используйте подходящий язык\n4. 享受多语言体验 🌏 Enjoy the multilingual experience 🗺️";

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: unicodeCommunityName,
          display_title: unicodeDisplayTitle,
          description: unicodeDescription,
          rules: unicodeRules,
          icon_url: "https://example.com/unicode-icon.png",
          banner_url: "https://example.com/unicode-banner.png",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community by name
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: unicodeCommunityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate Unicode preservation - display_title
  TestValidator.equals(
    "display_title with Unicode characters is preserved exactly",
    retrievedCommunity.display_title,
    unicodeDisplayTitle,
  );

  // Step 5: Validate Unicode preservation - description
  TestValidator.equals(
    "description with Unicode characters is preserved exactly",
    retrievedCommunity.description,
    unicodeDescription,
  );

  // Step 6: Validate Unicode preservation - rules
  TestValidator.equals(
    "rules with Unicode characters are preserved exactly",
    retrievedCommunity.rules,
    unicodeRules,
  );

  // Step 7: Validate community ID matches
  TestValidator.equals(
    "retrieved community ID matches created community",
    retrievedCommunity.id,
    createdCommunity.id,
  );

  // Step 8: Validate community name matches
  TestValidator.equals(
    "retrieved community name matches created community",
    retrievedCommunity.name,
    unicodeCommunityName,
  );

  // Step 9: Validate all other properties match
  TestValidator.equals(
    "icon_url is preserved correctly",
    retrievedCommunity.icon_url,
    createdCommunity.icon_url,
  );

  TestValidator.equals(
    "banner_url is preserved correctly",
    retrievedCommunity.banner_url,
    createdCommunity.banner_url,
  );

  TestValidator.equals(
    "creator_member_id matches moderator ID",
    retrievedCommunity.creator_member_id,
    moderator.id,
  );

  // Step 10: Validate no character corruption occurred (additional safety check)
  TestValidator.predicate(
    "display_title contains emoji characters",
    retrievedCommunity.display_title.includes("🌍"),
  );

  TestValidator.predicate(
    "description contains Chinese characters",
    retrievedCommunity.description.includes("欢迎") &&
      retrievedCommunity.description.includes("中文"),
  );

  TestValidator.predicate(
    "description contains Cyrillic characters",
    retrievedCommunity.description.includes("Русский"),
  );

  TestValidator.predicate(
    "description contains Arabic characters",
    retrievedCommunity.description.includes("العربية"),
  );

  TestValidator.predicate(
    "rules contain multilingual content",
    retrievedCommunity.rules.includes("规则") &&
      retrievedCommunity.rules.includes("Правила"),
  );
}
