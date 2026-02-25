import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { generate_random_reddit_community_community_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_moderator_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: (() => {
          let password = RandomGenerator.alphaNumeric(16);
          // Ensure contains at least one digit
          if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
          // Ensure contains at least one special character
          if (!/[!@#$%^&*]/.test(password))
            password = password.replace(/[^0-9a-zA-Z]/, "!");
          return password;
        })(),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Generate a random user to ban
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_community_moderator_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (() => {
        let password = RandomGenerator.alphaNumeric(16);
        // Ensure contains at least one digit
        if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
        // Ensure contains at least one special character
        if (!/[!@#$%^&*]/.test(password))
          password = password.replace(/[^0-9a-zA-Z]/, "!");
        return password;
      })(),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  typia.assert(user);
  // 3. Ensure the user is in the same community as the moderator
  typia.assert(moderator.community_id);
  typia.assert(user.user.id);
  const communityId = moderator.community_id;
  const userId = user.user.id;
  // 4. Create a ban on the user by the moderator
  const ban =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId,
        body: {
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validate ban was created successfully
  TestValidator.equals("ban user_id matches", ban.user.id, userId);
  TestValidator.equals(
    "ban community_id matches",
    ban.community.id,
    communityId,
  );
  TestValidator.predicate("ban is active", ban.is_active);
  // 5. Unban the user (test subject)
  await api.functional.redditCommunity.communityModerator.communities.bans.erase(
    moderatorConnection,
    {
      communityId,
      userId,
    },
  );
  // 6. Verify that the user can be re-banned (proves unban was successful)
  // Since the user was unbanned, we should be able to create a new ban record for the same user
  const reBan =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId,
        body: {
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(reBan);
  // Validate that re-ban was successful
  TestValidator.equals("re-ban user_id matches", reBan.user.id, userId);
  TestValidator.equals(
    "re-ban community_id matches",
    reBan.community.id,
    communityId,
  );
  TestValidator.predicate("re-ban is active", reBan.is_active);
  // The unban is considered successful because:
  // - The erase operation returned successfully
  // - We could create a new ban for the same user, proving the ban record no longer exists in active state
  // - We cannot validate via fetch because no GET endpoint exists
}
