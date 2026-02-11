import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_feed_preferences_default_values(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member (this member will have no existing preferences)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Get preferences for the new member (should return defaults)
  const preferences: IRedditPlatformFeedPreference =
    await api.functional.redditPlatform.member.preferences.my.at(
      memberConnection,
    );
  typia.assert(preferences);
  // Step 3: Validate default values
  TestValidator.equals(
    "default feed type is HOME",
    preferences.defaultFeedType,
    "HOME",
  );
  TestValidator.equals(
    "default sort order is TOP",
    preferences.defaultSortOrder,
    "TOP",
  );
  TestValidator.equals(
    "home feed subscribed only is true",
    preferences.homeFeedSubscribedOnly,
    true,
  );
  TestValidator.equals(
    "content karma threshold is null",
    preferences.contentKarmaThreshold,
    null,
  );
  TestValidator.equals("show NSFW is false", preferences.showNsfw, false);
  TestValidator.equals("theme is light", preferences.theme, "light");
  TestValidator.equals(
    "interface density is normal",
    preferences.interfaceDensity,
    "normal",
  );
  TestValidator.equals(
    "content language is empty string",
    preferences.contentLanguage,
    "",
  );
  TestValidator.equals(
    "hide muted communities is true",
    preferences.hideMutedCommunities,
    true,
  );
  TestValidator.equals(
    "auto expand media is true",
    preferences.autoExpandMedia,
    true,
  );
  TestValidator.equals(
    "infinite scroll is true",
    preferences.infiniteScroll,
    true,
  );
  TestValidator.equals(
    "comment sort order is TOP",
    preferences.commentSortOrder,
    "TOP",
  );
  TestValidator.equals(
    "show community recommendations is true",
    preferences.showCommunityRecommendations,
    true,
  );
  TestValidator.equals(
    "show trending topics is true",
    preferences.showTrendingTopics,
    true,
  );
  TestValidator.equals(
    "enable recommendations is true",
    preferences.enableRecommendations,
    true,
  );
  TestValidator.predicate(
    "created_at exists",
    preferences.createdAt !== undefined && preferences.createdAt !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    preferences.updatedAt !== undefined && preferences.updatedAt !== null,
  );
}
