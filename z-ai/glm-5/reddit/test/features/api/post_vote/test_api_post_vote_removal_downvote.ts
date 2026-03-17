import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test removing a downvote from a post and verify vote record deletion.
 *
 * This test validates that:
 * 1. A member can remove their downvote from a post
 * 2. After removal, the member can cast a fresh vote on the same post
 * 3. Attempting to remove a non-existent vote fails appropriately
 */
export async function test_api_post_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member who will own the post
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Authenticate member who will cast and remove the downvote
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 3. Create community (author creates it)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Create text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
        body: { postType: "text" },
      },
    );
  typia.assert(post);
  // 5. Cast downvote on the post (voter)
  const downvote =
    await generate_random_community_platform_member_posts_vote_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Verify vote was created with correct type
  TestValidator.equals("downvote created", downvote.voteType, "downvote");
  TestValidator.equals("vote target is correct", downvote.targetId, post.id);
  // 6. Remove the downvote
  await api.functional.communityPlatform.member.posts.vote.erase(
    voterConnection,
    {
      postId: post.id,
    },
  );
  // 7. Verify vote was removed by casting a fresh upvote
  // (If vote wasn't removed, this would fail with conflict)
  const freshUpvote =
    await generate_random_community_platform_member_posts_vote_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(freshUpvote);
  // Verify fresh vote was created with correct type
  TestValidator.equals("fresh upvote created", freshUpvote.voteType, "upvote");
  TestValidator.equals(
    "fresh vote target is correct",
    freshUpvote.targetId,
    post.id,
  );
  // 8. Verify that attempting to remove vote again fails (vote no longer exists)
  await TestValidator.error("cannot remove non-existent vote", async () => {
    await api.functional.communityPlatform.member.posts.vote.erase(
      voterConnection,
      {
        postId: post.id,
      },
    );
  });
}
