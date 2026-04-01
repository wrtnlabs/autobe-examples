import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test community owner removing a moderator from their community.
 *
 * This test validates the complete moderator removal workflow:
 * 1. Owner account creation and community establishment
 * 2. Moderator account creation and addition to community
 * 3. Owner removes moderator using DELETE endpoint
 * 4. Verify removed moderator loses all moderation privileges
 */
export async function test_api_moderator_removal_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community with unique name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals("community owner", community.owner.id, ownerAuth.id);
  // 3. Create moderator account (second member)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Add moderator to community (owner performs this action)
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(moderatorRecord);
  TestValidator.equals(
    "moderator member",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "moderator active",
    moderatorRecord.deleted_at === null,
  );
  // 5. Owner removes moderator from community
  await api.functional.redditCommunity.member.communities.moderators.erase(
    ownerConnection,
    {
      communityName: communityName,
      memberId: moderatorAuth.id,
    },
  );
  // 6. Verify removed moderator cannot perform moderation actions
  // Try to add another moderator (should fail as they're no longer a moderator)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMemberAuth = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(thirdMemberAuth);
  // Removed moderator should not be able to add new moderators
  await TestValidator.error(
    "removed moderator cannot add moderators",
    async () => {
      await api.functional.redditCommunity.member.communities.moderators.create(
        moderatorConnection,
        {
          communityName: communityName,
          body: {
            member_id: thirdMemberAuth.id,
          } satisfies IRedditCommunityModerator.ICreate,
        },
      );
    },
  );
  // 7. Verify owner can still add new moderators (privileges intact)
  const newModeratorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: thirdMemberAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(newModeratorRecord);
  TestValidator.equals(
    "new moderator member",
    newModeratorRecord.member.id,
    thirdMemberAuth.id,
  );
}
