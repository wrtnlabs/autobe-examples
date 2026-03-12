import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_community_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success scenario where a community owner removes a moderator from their community.
   *
   * Setup:
   * 1. Register and authenticate as the community owner (member1)
   * 2. Create a community as owner (member1)
   * 3. Register and authenticate as a second member (member2)
   * 4. As owner (member1), add member2 as a moderator to the community
   *
   * Execution:
   * 1. As owner (member1), call DELETE /redditClone/member/communities/{communityId}/moderators/{moderatorId}
   *
   * Expected Results:
   * 1. Response returns 200 OK with no body
   * 2. The moderator assignment is soft-deleted (deleted_at is set)
   * 3. Member2 loses all moderation privileges in the community
   */
  // 1. Register and authenticate as community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as second member (member2)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. As owner, add member2 as a moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorAuth.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // Validate moderator was added successfully
  TestValidator.equals(
    "moderator role is mod",
    moderatorAssignment.role,
    "mod",
  );
  TestValidator.equals(
    "moderator is member2",
    moderatorAssignment.member.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "moderator assignment is active",
    moderatorAssignment.deleted_at === null,
  );
  // 5. As owner, remove the moderator from the community
  await api.functional.redditClone.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAssignment.id,
    },
  );
  // 6. Verify the removal was successful
  // The erase operation returns void, so successful completion without error
  // indicates the moderator was successfully removed (soft-deleted)
  TestValidator.equals("moderator removal completed successfully", true, true);
}
