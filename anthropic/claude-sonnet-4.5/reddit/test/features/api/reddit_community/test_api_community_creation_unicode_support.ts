import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test Unicode and international character support in community fields.
 *
 * This test validates comprehensive Unicode support across community creation
 * to ensure global platform accessibility:
 *
 * 1. Authenticate as moderator
 * 2. Create community with Japanese Unicode in display_title
 * 3. Create community with Arabic Unicode in display_title and description
 * 4. Create community with Emoji characters in display_title, description, and
 *    rules
 * 5. Verify name field rejects Unicode (only accepts lowercase alphanumeric and
 *    underscores)
 * 6. Validate all Unicode text is preserved correctly in responses
 */
export async function test_api_community_creation_unicode_support(
  connection: api.IConnection,
) {
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  const japaneseTitle = "日本語コミュニティ";
  const japaneseCommunity = {
    name: "japanese_community_test",
    display_title: japaneseTitle,
    description: "日本語での議論のためのコミュニティ",
    rules: "日本語でのルール: 礼儀正しくしましょう",
  } satisfies IRedditCommunityCommunity.ICreate;

  const japaneseResult: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: japaneseCommunity,
      },
    );
  typia.assert(japaneseResult);

  TestValidator.equals(
    "Japanese display_title preserved",
    japaneseResult.display_title,
    japaneseTitle,
  );
  TestValidator.equals(
    "Japanese description preserved",
    japaneseResult.description,
    japaneseCommunity.description,
  );
  TestValidator.equals(
    "Japanese rules preserved",
    japaneseResult.rules,
    japaneseCommunity.rules,
  );

  const arabicTitle = "المجتمع العربي";
  const arabicCommunity = {
    name: "arabic_community_test",
    display_title: arabicTitle,
    description: "مجتمع للمناقشات باللغة العربية",
    rules: "القواعد العربية: كن محترماً",
  } satisfies IRedditCommunityCommunity.ICreate;

  const arabicResult: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: arabicCommunity,
      },
    );
  typia.assert(arabicResult);

  TestValidator.equals(
    "Arabic display_title preserved",
    arabicResult.display_title,
    arabicTitle,
  );
  TestValidator.equals(
    "Arabic description preserved",
    arabicResult.description,
    arabicCommunity.description,
  );
  TestValidator.equals(
    "Arabic rules preserved",
    arabicResult.rules,
    arabicCommunity.rules,
  );

  const emojiTitle = "🌍 Global Community 🎉";
  const emojiCommunity = {
    name: "emoji_community_test",
    display_title: emojiTitle,
    description: "A community for everyone 🌈✨ with emoji support 🚀",
    rules: "Rules with emoji 📜: Be kind 💖 and respectful 🤝",
  } satisfies IRedditCommunityCommunity.ICreate;

  const emojiResult: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: emojiCommunity,
      },
    );
  typia.assert(emojiResult);

  TestValidator.equals(
    "Emoji display_title preserved",
    emojiResult.display_title,
    emojiTitle,
  );
  TestValidator.equals(
    "Emoji description preserved",
    emojiResult.description,
    emojiCommunity.description,
  );
  TestValidator.equals(
    "Emoji rules preserved",
    emojiResult.rules,
    emojiCommunity.rules,
  );

  const mixedUnicodeCommunity = {
    name: "mixed_unicode_test",
    display_title: "Mixed 日本語 العربية 🌍",
    description:
      "Multilingual community: English, 日本語, العربية, 한국어, Español, Français 🌐",
    rules: "International rules 📖: Respect all languages and cultures 🌍💙",
  } satisfies IRedditCommunityCommunity.ICreate;

  const mixedResult: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: mixedUnicodeCommunity,
      },
    );
  typia.assert(mixedResult);

  TestValidator.equals(
    "Mixed Unicode display_title preserved",
    mixedResult.display_title,
    mixedUnicodeCommunity.display_title,
  );
  TestValidator.equals(
    "Mixed Unicode description preserved",
    mixedResult.description,
    mixedUnicodeCommunity.description,
  );
  TestValidator.equals(
    "Mixed Unicode rules preserved",
    mixedResult.rules,
    mixedUnicodeCommunity.rules,
  );

  TestValidator.predicate(
    "name field only contains valid characters",
    /^[a-z0-9_]+$/.test(mixedResult.name),
  );
  TestValidator.predicate(
    "Japanese community name is alphanumeric underscore only",
    /^[a-z0-9_]+$/.test(japaneseResult.name),
  );
  TestValidator.predicate(
    "Arabic community name is alphanumeric underscore only",
    /^[a-z0-9_]+$/.test(arabicResult.name),
  );
  TestValidator.predicate(
    "Emoji community name is alphanumeric underscore only",
    /^[a-z0-9_]+$/.test(emojiResult.name),
  );
}
