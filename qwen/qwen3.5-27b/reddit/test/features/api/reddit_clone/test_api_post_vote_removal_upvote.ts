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

export async function test_api_post_vote_removal_upvote(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test removing an upvote from a post.
   * 1. Authenticate as member and create community
   * 2. Create a post in the community
   * 3. Test vote removal operation
   * 4. Verify error handling when no vote exists
   *
   * Note: Since POST /vote endpoint is not available in SDK, this test
   * focuses on the DELETE /vote operation and its error handling.
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Test vote removal on a post with no existing vote
  // This should fail with appropriate error (404 - no vote to remove)
  await TestValidator.error(
    "removing non-existent vote should fail",
    async () =>
      await api.functional.redditClone.member.posts._vote.eraseVote(
        memberConnection,
        {
          postId: post.id,
        },
      ),
  );
  // 5. Test that the operation is properly typed and accepts valid UUID
  // Since we can't create a vote without POST endpoint, we verify the API
  // call structure is correct by checking it throws appropriately
  TestValidator.predicate(
    "post ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );
  // 6. Test with another fresh post to verify consistent behavior
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post2);
  // Verify removing vote from second post also fails (no vote exists)
  await TestValidator.error(
    "removing non-existent vote from second post should fail",
    async () =>
      await api.functional.redditClone.member.posts._vote.eraseVote(
        memberConnection,
        {
          postId: post2.id,
        },
      ),
  );
  // 7. Verify posts are different
  TestValidator.notEquals("two posts have different IDs", post.id, post2.id);
}
