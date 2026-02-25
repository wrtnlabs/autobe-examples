import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

export async function test_api_ban_record_viewed_by_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Create new connection with moderator token
  const modAuthConnection: api.IConnection = { host: connection.host };
  modAuthConnection.headers = { Authorization: moderator.token.access };
  // 2. Create a community
  const community =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      modAuthConnection,
      {
        communityId: RandomGenerator.alphaNumeric(8),
        body: {
          member_id: RandomGenerator.alphaNumeric(8),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCloneBanRecord.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create banned user and authenticate
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedUser = await api.functional.redditClone.auth.moderator.join(
    bannedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(bannedUser);
  // Create new connection with banned user token
  const bannedAuthConnection: api.IConnection = { host: connection.host };
  bannedAuthConnection.headers = { Authorization: bannedUser.token.access };
  // 4. Ban the user
  const banRecord =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      modAuthConnection,
      {
        communityId: community.community_id,
        body: {
          member_id: bannedUser.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCloneBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Banned user retrieves their own ban record
  const retrievedBan = await api.functional.redditClone.bans.at(
    bannedAuthConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate ban record details
  TestValidator.equals("ban record matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    banRecord.community_id,
  );
  TestValidator.equals("member matches", retrievedBan.user.id, bannedUser.id);
  TestValidator.equals(
    "moderator matches",
    retrievedBan.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.banReason,
    banRecord.reason,
  );
  TestValidator.equals(
    "ban start date matches",
    retrievedBan.banStartDate,
    banRecord.created_at,
  );
  TestValidator.equals(
    "ban end date matches",
    retrievedBan.banEndDate,
    banRecord.expires_at,
  );
}
