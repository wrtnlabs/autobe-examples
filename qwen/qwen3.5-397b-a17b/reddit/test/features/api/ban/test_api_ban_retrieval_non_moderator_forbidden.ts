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
 * Test that a non-moderator member cannot retrieve ban details from a community.
 *
 * This test validates the access control for ban retrieval:
 * 1. Create a member account who will be the community owner
 * 2. Create a community owned by the first member
 * 3. Create a second member account (regular user, not a moderator)
 * 4. Create a third member account who will be banned
 * 5. Issue a ban as the community owner against the third member
 * 6. Attempt to retrieve the ban details using the second member's connection (non-moderator)
 * 7. Validate that the request fails with 404 error since non-moderators cannot access ban info
 */
export async function test_api_ban_retrieval_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}`,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community owned by the first member
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(8)}${Date.now()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create second member (regular user, not moderator)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}`,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(nonModeratorAuth);
  // 4. Create third member (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}`,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 5. Issue ban as community owner against the third member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(ban);
  // 6. Attempt to retrieve ban details using non-moderator's connection
  // 7. Validate that it returns 404 error (non-moderators cannot access ban info)
  await TestValidator.error("non-moderator cannot retrieve ban", async () => {
    await api.functional.redditClone.member.communities.bans.at(
      nonModeratorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  });
}
