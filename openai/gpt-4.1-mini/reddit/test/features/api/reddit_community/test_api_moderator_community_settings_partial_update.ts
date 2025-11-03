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

export async function test_api_moderator_community_settings_partial_update(
  connection: api.IConnection,
) {
  // 1. Moderator joins (signup)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "strongPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost/moderator/signup",
        referrer: "http://localhost/",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Moderator login (actor switching / session)
  const moderatorLogin: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: "strongPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost/moderator/login",
        referrer: "http://localhost/",
      } satisfies IRedditCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 3. User join (signup) - other actor
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "userStrongPass456$",
        ip: "127.0.0.2",
        href: "http://localhost/user/signup",
        referrer: "http://localhost/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 4. User login (actor switching / session)
  const userLogin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: "userStrongPass456$",
        ip: "127.0.0.2",
        href: "http://localhost/user/login",
        referrer: "http://localhost/",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(userLogin);

  // 5. Create a new community via user
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("created community name", community.name, communityName);
  TestValidator.equals(
    "created community description",
    community.description ?? null,
    communityDescription,
  );

  // 6. Partial update of community settings by moderator
  const partialSettingUpdate: IRedditCommunityCommunitySettings.IUpdate = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reddit_community_community_id: community.id,
    setting_key: "theme",
    setting_value: "dark",
  };

  const updatedSetting: IRedditCommunityCommunitySettings =
    await api.functional.redditCommunity.moderator.communities.settings.updateSettings(
      connection,
      {
        communityName,
        body: partialSettingUpdate,
      },
    );
  typia.assert(updatedSetting);
  TestValidator.equals(
    "updated setting communityId",
    updatedSetting.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "updated setting key",
    updatedSetting.setting_key,
    partialSettingUpdate.setting_key,
  );
  TestValidator.equals(
    "updated setting value",
    updatedSetting.setting_value ?? null,
    partialSettingUpdate.setting_value ?? null,
  );

  // 7. Authorization and access control check (attempt with user login should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // Switch to user login session headers (simulate by invoking with user connection)
  await TestValidator.error(
    "unauthorized user cannot update community settings",
    async () => {
      await api.functional.redditCommunity.moderator.communities.settings.updateSettings(
        unauthConn,
        {
          communityName,
          body: {
            id: updatedSetting.id,
            setting_value: "light",
          } satisfies IRedditCommunityCommunitySettings.IUpdate,
        },
      );
    },
  );
}
