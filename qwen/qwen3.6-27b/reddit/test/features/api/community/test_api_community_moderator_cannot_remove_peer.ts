import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Validates that only community owners can remove moderators from their community.
 *
 * Tests the authority-based access control on the moderator removal endpoint. Verifies that a user with MODERATOR authority cannot remove another moderator, the system responds with 403 Forbidden, and the hierarchical moderation structure remains intact.
 *
 * This test ensures that peer moderators cannot elevate or diminish each other's authority without owner intervention, preserving the community governance model.
 *
 * 1. Owner registers and creates a community, automatically becoming OWNER. 2. Attacker user registers and is appointed as MODERATOR by the owner. 3. Target user registers and is appointed as MODERATOR by the owner. 4. Attacker attempts to remove the target moderator and receives 403 Forbidden.
 */
export async function test_api_community_moderator_cannot_remove_peer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      username: RandomGenerator.name(1),
    },
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Attacker joins and is appointed as MODERATOR by owner
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerPassword = RandomGenerator.alphaNumeric(16);
  const attackerJoinResult = await authorize_member_join(attackerConnection, {
    body: {
      email: attackerEmail,
      password: attackerPassword,
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(attackerJoinResult);
  const attackerModerator =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: attackerJoinResult.id,
          community_id: community.id,
        },
      },
    );
  typia.assert(attackerModerator);
  // 3. Target user joins and is appointed as MODERATOR by owner
  const targetConnection: api.IConnection = { host: connection.host };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = RandomGenerator.alphaNumeric(16);
  const targetJoinResult = await authorize_member_join(targetConnection, {
    body: {
      email: targetEmail,
      password: targetPassword,
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(targetJoinResult);
  const targetModerator =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: targetJoinResult.id,
          community_id: community.id,
        },
      },
    );
  typia.assert(targetModerator);
  // 4. Attacker (MODERATOR) tries to remove target moderator → 403 Forbidden
  await TestValidator.httpError(
    "moderator cannot remove peer moderator",
    403,
    async () =>
      await api.functional.redditLikeCommunity.member.communities.moderators.erase(
        attackerConnection,
        {
          communityId: community.id,
          moderatorId: targetModerator.id,
        },
      ),
  );
}
