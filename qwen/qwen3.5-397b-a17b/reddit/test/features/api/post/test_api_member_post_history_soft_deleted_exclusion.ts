import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_member_post_history_soft_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create querying member (authenticated user who will fetch post history)
  const queryMemberConnection: api.IConnection = { host: connection.host };
  const queryMember = await authorize_member_join(queryMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(queryMember);
  // 2. Create target member (whose posts will be queried)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Create a community using target member's connection
  const community = await generate_random_reddit_clone_communities_create(
    targetMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe target member to the community (should already be subscribed as owner, but ensure)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      targetMemberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create multiple posts (5 posts) by the target member
  const totalPosts = 5;
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < totalPosts; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      targetMemberConnection,
      {
        body: {
          title: `Test Post ${i + 1} - ${RandomGenerator.name()}`,
          post_type: "TEXT",
          community_id: community.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 6. Soft-delete 2 out of 5 posts using target member's connection
  const deletedPostCount = 2;
  const postsToDelete = posts.slice(0, deletedPostCount);
  const remainingPostCount = totalPosts - deletedPostCount;
  for (const postToDelete of postsToDelete) {
    await api.functional.redditClone.member.posts.erase(
      targetMemberConnection,
      {
        postId: postToDelete.id,
      },
    );
  }
  // 7. Query the target member's post history using querying member's connection
  const postHistory =
    await api.functional.redditClone.member.members.posts.index(
      queryMemberConnection,
      {
        memberId: targetMember.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        },
      },
    );
  typia.assert(postHistory);
  // 8. Validate that only non-deleted posts appear in the response
  TestValidator.equals(
    "pagination records count matches non-deleted posts",
    postHistory.pagination.records,
    remainingPostCount,
  );
  TestValidator.equals(
    "data array length matches non-deleted posts",
    postHistory.data.length,
    remainingPostCount,
  );
  // 9. Validate that all returned posts have deleted_at as null (implicitly via typia.assert)
  // and verify vote_score and comment_count are present
  for (const postSummary of postHistory.data) {
    // Verify post structure is valid (typia.assert already did this)
    typia.assert(postSummary);
    // Verify vote_score is an integer
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(postSummary.vote_score),
    );
    // Verify comment_count is an integer
    TestValidator.predicate(
      "comment_count is integer",
      Number.isInteger(postSummary.comment_count),
    );
    // Verify none of the returned posts are from the deleted set
    const isDeletedPost = postsToDelete.some(
      (deletedPost) => deletedPost.id === postSummary.id,
    );
    TestValidator.predicate(
      "deleted post excluded from results",
      !isDeletedPost,
    );
  }
  // 10. Verify that remaining posts are the ones we didn't delete
  const remainingPosts = posts.slice(deletedPostCount);
  const returnedPostIds = postHistory.data.map((p) => p.id);
  const expectedPostIds = remainingPosts.map((p) => p.id);
  TestValidator.equals(
    "returned post IDs match expected remaining posts",
    returnedPostIds.sort(),
    expectedPostIds.sort(),
  );
}
