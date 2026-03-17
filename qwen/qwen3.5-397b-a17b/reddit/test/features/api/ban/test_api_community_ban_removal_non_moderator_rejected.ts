import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test authorization failure when non-moderator attempts to remove community ban.
 *
 * Test Steps:
 * 1. Authenticate as member who will own the community
 * 2. Create a new community (owner becomes moderator automatically)
 * 3. Authenticate as a different member who will be banned
 * 4. As the community owner, create a ban against the second member
 * 5. Authenticate as a third member who is NOT a moderator of the community
 * 6. Attempt to delete the ban as the non-moderator member
 *
 * Expected Outcome:
 * - Ban deletion attempt by non-moderator fails with 403 error
 * - The ban record remains unchanged (still active)
 */
export async function test_api_community_ban_removal_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community (owner becomes moderator automatically)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create member who will be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedUser);
  // 4. Create ban against the second member (as community owner/moderator)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: bannedUser.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Create third member (non-moderator of the community)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(nonModerator);
  // 6. Attempt to delete ban as non-moderator - should fail with 403 Forbidden
  await TestValidator.error("non-moderator ban removal rejected", async () => {
    await api.functional.redditClone.member.communities.bans.erase(
      nonModeratorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  });
}