import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySettings";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * This test validates the entire flow of a moderator replacing community
 * settings.
 *
 * Steps:
 *
 * 1. Moderator account creation (join), including ip, href, referrer
 * 2. Moderator login to obtain credentials
 * 3. User account creation (join), including ip, href, referrer
 * 4. User login for session
 * 5. User creates a community with unique name and optional description
 * 6. Moderator replaces all settings of the community using full settings data
 * 7. Validate that returned settings match those sent
 *
 * The test ensures authorization, data integrity, and correct persistence.
 */
export async function test_api_community_settings_replace_by_moderator(
  connection: api.IConnection,
) {
  // Moderator joins
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    email: moderatorEmail,
    password: "Password123!",
    ip: RandomGenerator.mobile(),
    href: "https://example.com/moderator/join",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // Moderator login
  const moderatorLoginBody = {
    email: moderatorEmail,
    password: "Password123!",
    ip: RandomGenerator.mobile(),
    href: "https://example.com/moderator/login",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityModerator.ILogin;
  const moderatorLoggedIn: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // User joins
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: "UserPass123!",
    ip: RandomGenerator.mobile(),
    href: "https://example.com/user/join",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // User login
  const userLoginBody = {
    email: userEmail,
    password: "UserPass123!",
    ip: RandomGenerator.mobile(),
    href: "https://example.com/user/login",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityUser.ILogin;
  const userLoggedIn: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: userLoginBody });
  typia.assert(userLoggedIn);

  // User creates a community
  const communityName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const communityCreateBody = {
    name: communityName,
    description: communityDescription,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // Moderator replaces community settings
  const currentTimeISO = new Date().toISOString();
  const settingKeys = [
    "allowPosts",
    "maxPostLength",
    "description",
    "allowImages",
  ] as const;

  // Create a realistic settings payload matching IRedditCommunityCommunitySettings.ICreate
  // For demonstration, set varied realistic values
  const settingsToReplace = settingKeys.map((key) => {
    let value: string | null = null;
    switch (key) {
      case "allowPosts":
        value = "true"; // as string for boolean-like key
        break;
      case "maxPostLength":
        value = "10000"; // max post length numeric as string
        break;
      case "description":
        value = communityDescription;
        break;
      case "allowImages":
        value = "false";
        break;
    }
    return {
      reddit_community_community_id: community.id,
      setting_key: key,
      setting_value: value,
      created_at: currentTimeISO,
      updated_at: currentTimeISO,
    } satisfies IRedditCommunityCommunitySettings.ICreate;
  });

  // Call replaceSettings endpoint by moderator with auth context
  // To switch roles, log in moderator session - SDK manages authorization tokens
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  for (const setting of settingsToReplace) {
    const replacedSetting: IRedditCommunityCommunitySettings =
      await api.functional.redditCommunity.moderator.communities.settings.replaceSettings(
        connection,
        {
          communityName: communityName,
          body: setting,
        },
      );
    typia.assert(replacedSetting);
    TestValidator.equals(
      "setting key matches",
      replacedSetting.setting_key,
      setting.setting_key,
    );
    TestValidator.equals(
      "setting value matches",
      replacedSetting.setting_value ?? null,
      setting.setting_value ?? null,
    );
  }
}
