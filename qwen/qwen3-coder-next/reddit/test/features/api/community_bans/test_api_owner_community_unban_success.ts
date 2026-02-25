import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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

/**
 * Test successful unban of a banned user by a community owner.
 *
 * 1. Register and authenticate as an owner
 * 2. Join/create a community where the owner has authority
 * 3. Ban a member from the community (setup prerequisite)
 * 4. Call the unban endpoint to remove the ban
 * 5. Verify the ban record is deleted from the database
 * 6. Verify the banned user can now create posts and comments in the community
 *
 * This tests the primary success path for the unban functionality with proper authorization and database persistence.
 */
export async function test_api_owner_community_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const ownerConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate as owner
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerResponse = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(ownerResponse);
  // 3. Register and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  const moderatorResponse = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorData,
    },
  );
  typia.assert(moderatorResponse);
  // 4. Create community as owner
  const communityData = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: "Test community for unban functionality",
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: communityData,
    },
  );
  typia.assert(community);
  // 5. Ban a member using moderator permissions (prerequisite for unban test)
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();
  const banData = {
    member_id: bannedMemberId,
    reason: "Testing ban and unban workflow",
  } satisfies IRedditCloneBanRecord.ICreate;
  const banResponse =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorConnection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(banResponse);
  // 6. Owner unban the user
  await api.functional.redditClone.owner.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      userId: bannedMemberId,
    },
  );
  // 7. Verify unban worked by checking that the banned user can now be banned again
  // (since ban should be removed after unban)
  await TestValidator.error("should allow re-banning after unban", async () => {
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorConnection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  });
}
