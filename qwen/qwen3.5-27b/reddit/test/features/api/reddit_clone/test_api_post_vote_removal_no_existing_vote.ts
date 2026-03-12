import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test attempting to remove a vote when no vote exists.
 *
 * This test validates that the system correctly handles attempts to remove
 * non-existent votes by returning a 404 Not Found response. The test creates
 * a post without casting any vote, then attempts to remove the vote.
 * The system should reject this operation and leave the post score and
 * author's karma unchanged.
 */
export async function test_api_post_vote_removal_no_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post WITHOUT casting any vote
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // Capture initial state
  const initialScore = post.score;
  const initialKarma = post.author.karma;
  // 4. Attempt to remove a vote that doesn't exist
  await TestValidator.httpError(
    "should return 404 when removing non-existent vote",
    404,
    async () =>
      await api.functional.redditClone.member.posts._vote.eraseVote(
        memberConnection,
        {
          postId: post.id,
        },
      ),
  );
  // 5. Verify post score remains unchanged
  TestValidator.equals("post score unchanged", initialScore, post.score);
  // 6. Verify author karma remains unchanged
  TestValidator.equals(
    "author karma unchanged",
    initialKarma,
    post.author.karma,
  );
}
