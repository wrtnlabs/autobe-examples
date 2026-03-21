import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_comments_sorted_by_controversial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments with various vote scores (near zero for controversial)
  // Comment with score 0 (most controversial)
  const commentZero =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "This is a controversial comment with zero score" },
        params: { postId: post.id },
      },
    );
  typia.assert(commentZero);
  // Comment with score 1
  const commentOne =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Comment with score of 1" },
        params: { postId: post.id },
      },
    );
  typia.assert(commentOne);
  // Comment with score -1
  const commentNegativeOne =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Comment with score of negative one" },
        params: { postId: post.id },
      },
    );
  typia.assert(commentNegativeOne);
  // Comment with score 2
  const commentTwo =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Comment with score of 2" },
        params: { postId: post.id },
      },
    );
  typia.assert(commentTwo);
  // Comment with score -2
  const commentNegativeTwo =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Comment with score of negative two" },
        params: { postId: post.id },
      },
    );
  typia.assert(commentNegativeTwo);
  // 6. Delete some comments (soft-delete)
  await api.functional.redditClone.member.comments.erase(memberConnection, {
    commentId: commentOne.id,
  });
  await api.functional.redditClone.member.comments.erase(memberConnection, {
    commentId: commentNegativeTwo.id,
  });
  // 7. Call the target endpoint with sortBy='controversial'
  const commentsPage =
    await api.functional.redditClone.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sortBy: "controversial",
        },
      },
    );
  typia.assert(commentsPage);
  // 8. Verify soft-deleted comments are NOT included
  const returnedIds = commentsPage.data.map((c) => c.id);
  TestValidator.equals(
    "deleted comments should not be in response",
    returnedIds.includes(commentOne.id),
    false,
  );
  TestValidator.equals(
    "deleted comments should not be in response",
    returnedIds.includes(commentNegativeTwo.id),
    false,
  );
  // 9. Verify pagination count excludes deleted comments (3 remaining, 2 deleted)
  TestValidator.equals(
    "pagination records should exclude deleted comments",
    commentsPage.pagination.records,
    3,
  );
  // 10. Verify sorting by controversial: ABS(vote_score) ASC, then vote_score DESC
  // Expected order: score 0 (abs=0), score -1 (abs=1), score 1 (abs=1), score 2 (abs=2)
  // For abs=1: -1 comes before 1 (vote_score DESC: -1 > 1 is false, so -1 comes first when sorting DESC)
  // Actually: ORDER BY ABS(vote_score) ASC, vote_score DESC
  // - ABS(0) = 0 < ABS(-1) = 1 < ABS(1) = 1 < ABS(2) = 2
  // - For same abs: vote_score DESC means larger scores first
  //   - For abs=1: -1 vs 1 -> vote_score DESC: 1 > -1, so 1 comes first
  // Wait, let me reconsider: vote_score DESC means highest first
  // For abs=1: 1 > -1, so 1 should come before -1
  // So order: 0, 1, -1, 2
  const scoreOrder = commentsPage.data.map((c) => c.vote_score);
  TestValidator.equals(
    "first comment should have score 0 (most controversial)",
    scoreOrder[0],
    0,
  );
  TestValidator.equals(
    "second comment should have score 1 (abs=1, then vote_score DESC)",
    scoreOrder[1],
    1,
  );
  TestValidator.equals(
    "third comment should have score -1 (abs=1, vote_score DESC: 1 > -1)",
    scoreOrder[2],
    -1,
  );
  TestValidator.equals(
    "fourth comment should have score 2 (abs=2)",
    scoreOrder[3],
    2,
  );
  // Also verify data array length
  TestValidator.equals(
    "data array should contain 3 non-deleted comments",
    commentsPage.data.length,
    3,
  );
}
