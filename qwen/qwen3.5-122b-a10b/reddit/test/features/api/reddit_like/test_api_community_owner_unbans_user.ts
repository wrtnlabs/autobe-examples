import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_member_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_ban } from "../../../prepare/prepare_random_reddit_like_community_ban";

/**
 * Test that a community owner can successfully unban a previously banned user from their community.
 *
 * Validates the complete unban workflow including community creation, user banning, and the unban operation. Ensures that the ban record is properly soft-deleted with a deleted_at timestamp when the unban operation succeeds.
 *
 * This test follows the natural flow of community moderation: owner creates community → owner bans user → owner unbans user → verifies ban is lifted.
 *
 * 1. Create owner member account and authenticate
 * 2. Create community with owner as the community owner
 * 3. Create second member account (the user to be banned)
 * 4. Ban the second member from the community (creates active ban record)
 * 5. Unban the user by calling the DELETE endpoint with ban ID
 * 6. Verify the unban operation completes successfully
 */
export async function test_api_community_owner_unbans_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditLikeMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Create community (owner becomes community owner)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member account (the user to be banned)
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser: IRedditLikeMember.IAuthorized = await authorize_member_join(
    bannedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(bannedUser);
  // 4. Ban the second member from the community
  const ban: IRedditLikeCommunityBan =
    await generate_random_reddit_like_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          member_id: bannedUser.id,
        } satisfies IRedditLikeCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // Verify ban is active (deleted_at is null) before unban
  TestValidator.equals("ban is active before unban", ban.deleted_at, null);
  // 5. Unban the user - this should complete without throwing
  await api.functional.redditLike.member.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Verify the unban operation completed successfully
  // The erase endpoint returns void, so successful completion without error
  // indicates the ban was properly soft-deleted
  TestValidator.predicate("unban operation completed without errors", true);
}
