import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create_ban";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderator_banned_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and register/create community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Create moderator connection and join community as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 3. Ban a test user to have data to retrieve in the banned users list
  const bannedUser =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCloneBanRecord.ICreate,
      },
    );
  typia.assert(bannedUser);
  // 4. Test banned users list retrieval as moderator
  const result = await api.functional.redditClone.moderator.communities.bans.at(
    moderatorConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(result);
  // 5. Validate results
  TestValidator.equals("data contains banned user", result.data.length, 1);
  TestValidator.equals(
    "banned user ID matches",
    result.data[0].id,
    bannedUser.id,
  );
  TestValidator.equals(
    "user matches",
    result.data[0].user.id,
    bannedUser.member.id,
  );
  TestValidator.equals(
    "moderator matches",
    result.data[0].moderator.id,
    bannedUser.moderator.id,
  );
  TestValidator.equals(
    "ban reason matches",
    result.data[0].banReason,
    bannedUser.reason,
  );
  TestValidator.equals(
    "ban start date matches",
    result.data[0].banStartDate,
    bannedUser.created_at,
  );
  TestValidator.equals(
    "appeal status is pending",
    result.data[0].appealStatus,
    "pending",
  );
  TestValidator.equals(
    "created at matches",
    result.data[0].createdAt,
    bannedUser.created_at,
  );
}
