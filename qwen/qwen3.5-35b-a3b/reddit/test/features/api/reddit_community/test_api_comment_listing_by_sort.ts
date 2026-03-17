import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_listing_by_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create a post in a community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: "Test post content for comment sorting validation",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create comments with varying timestamps
  // Comment 1 (created first)
  const comment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "First comment - oldest timestamp",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Comment 2 (created second)
  const comment2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "Second comment - middle timestamp",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Comment 3 (created last, will be newest)
  const comment3 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "Third comment - newest timestamp",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 4. Create a nested reply to test replyCount
  const replyToComment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "Reply to first comment",
          parent_comment_id: comment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyToComment1);
  // 5. Test sort='best'
  const bestResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best" as const,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(bestResponse);
  // Validate pagination metadata for best sort
  TestValidator.equals(
    "best sort - comments count",
    bestResponse.data.length,
    4,
  ); // 3 comments + 1 reply
  TestValidator.equals(
    "best sort - pagination current",
    bestResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "best sort - pagination limit",
    bestResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "best sort - pagination records",
    bestResponse.pagination.records,
    4,
  );
  TestValidator.equals(
    "best sort - pagination pages",
    bestResponse.pagination.pages,
    1,
  );
  // 6. Test sort='new' - most recent first
  const newResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new" as const,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(newResponse);
  TestValidator.equals("new sort - comments count", newResponse.data.length, 4);
  // Validate new sort ordering: comment3 (newest) should appear before comment1 (oldest)
  const newSorted = newResponse.data;
  const firstNew = newSorted[0];
  const lastNew = newSorted[newSorted.length - 1];
  TestValidator.predicate(
    "new sort - first comment is most recent",
    new Date(firstNew.createdAt).getTime() >=
      new Date(lastNew.createdAt).getTime(),
  );
  // 7. Test sort='controversial'
  const controversialResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial" as const,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialResponse);
  TestValidator.equals(
    "controversial sort - comments count",
    controversialResponse.data.length,
    4,
  );
  // Validate controversial sort ordering
  const controversialSorted = controversialResponse.data;
  const firstControversial = controversialSorted[0];
  const lastControversial = controversialSorted[controversialSorted.length - 1];
  const firstAbs = Math.abs(firstControversial.voteScore);
  const lastAbs = Math.abs(lastControversial.voteScore);
  TestValidator.predicate(
    "controversial sort - highest abs vote score first",
    firstAbs >= lastAbs,
  );
  // 8. Validate author information includes username and karma
  const author = bestResponse.data[0].author;
  TestValidator.equals("author - has id", author.id !== undefined, true);
  TestValidator.equals(
    "author - has username",
    author.username.length > 0,
    true,
  );
  TestValidator.predicate(
    "author - has karma (may be 0)",
    author.karma !== undefined,
  );
  // Validate profile information if available
  if (author.profile) {
    TestValidator.equals(
      "author - profile has display_name",
      author.profile.display_name.length > 0,
      true,
    );
    TestValidator.predicate(
      "author - profile has karma_score",
      author.profile.karma_score !== undefined,
    );
  }
  // 9. Validate replyCount for comments with nested replies
  const commentWithReply = bestResponse.data.find((c) => c.id === comment1.id);
  if (commentWithReply) {
    TestValidator.equals(
      "comment with reply - replyCount is 1",
      commentWithReply.replyCount, // should be 1 because comment1 has 1 reply
      1,
    );
  }
  // 10. Validate all comments have required summary fields
  for (const comment of bestResponse.data) {
    TestValidator.equals("comment - has id", comment.id !== undefined, true);
    TestValidator.equals(
      "comment - has voteScore",
      comment.voteScore !== undefined,
      true,
    );
    TestValidator.equals(
      "comment - has createdAt",
      comment.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "comment - has author",
      comment.author !== undefined,
      true,
    );
    TestValidator.equals(
      "comment - parentComment is present",
      comment.parentComment !== undefined,
      true,
    );
    TestValidator.predicate(
      "comment - replyCount is non-negative",
      comment.replyCount >= 0,
    );
    TestValidator.predicate(
      "comment - voteScore is integer",
      Number.isInteger(comment.voteScore),
    );
  }
}
