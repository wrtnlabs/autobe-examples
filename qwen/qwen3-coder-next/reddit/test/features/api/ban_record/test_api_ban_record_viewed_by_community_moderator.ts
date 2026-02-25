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

export async function test_api_ban_record_viewed_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Moderator setup - Join as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Generate community data for testing (community creation not available)
  const community: IRedditCloneCommunity.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(8),
    subscriberCount: 100,
    createdAt: new Date().toISOString(),
    owner: {
      id: moderator.id,
      username: moderator.username,
    },
  };
  // Step 3: Create a ban record using utility function
  const banRecord =
    await generate_random_reddit_clone_moderator_communities_bans_create_ban(
      moderatorConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCloneBanRecord.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(banRecord);
  // Step 4: Verify the ban record is visible to the moderator
  const retrievedBan = await api.functional.redditClone.bans.at(
    moderatorConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // Step 5: Validate ban record details
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "member matches",
    retrievedBan.user.id,
    banRecord.member_id,
  );
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
  TestValidator.predicate("ban is active", retrievedBan.banStartDate !== null);
}
