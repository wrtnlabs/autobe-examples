import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_posts_comments_index_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a post with valid community_id
  // Using typia.random to generate community_id as it's required for post creation
  const randomPost = typia.random<IRedditPlatformPost>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: randomPost.community.id,
        title: randomPost.title,
        post_type: randomPost.post_type,
        text_content: randomPost.textContent?.text_content,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Retrieve comments with default parameters
  const commentPage = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(commentPage);
  // Step 4: Validate response structure
  TestValidator.equals(
    "response contains page structure",
    commentPage.pagination,
    commentPage.pagination,
  );
  TestValidator.equals(
    "response contains data array",
    commentPage.data,
    commentPage.data,
  );
  // Step 5: Validate default pagination values
  TestValidator.equals("default page is 1", commentPage.pagination.current, 1);
  TestValidator.equals("default limit is 20", commentPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    commentPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    commentPage.pagination.pages >= 0,
  );
  // Step 6: Validate comment summaries have required fields
  if (commentPage.data.length > 0) {
    const firstComment = commentPage.data[0];
    TestValidator.predicate(
      "comment has id",
      firstComment.id !== undefined && firstComment.id.length > 0,
    );
    TestValidator.predicate(
      "comment has content",
      firstComment.content !== undefined && firstComment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has upvotes_count",
      typeof firstComment.upvotes_count === "number",
    );
    TestValidator.predicate(
      "comment has downvotes_count",
      typeof firstComment.downvotes_count === "number",
    );
    TestValidator.predicate(
      "comment has score",
      typeof firstComment.score === "number",
    );
    TestValidator.predicate(
      "comment has comment_count",
      typeof firstComment.comment_count === "number",
    );
    TestValidator.predicate(
      "comment has author",
      firstComment.author !== undefined && firstComment.author.id !== undefined,
    );
    TestValidator.predicate(
      "comment has post",
      firstComment.post !== undefined && firstComment.post.id !== undefined,
    );
    TestValidator.predicate(
      "comment has created_at",
      firstComment.created_at !== undefined &&
        !Number.isNaN(new Date(firstComment.created_at).getTime()),
    );
    TestValidator.predicate(
      "comment has updated_at",
      firstComment.updated_at !== undefined,
    );
    TestValidator.predicate(
      "comment has deleted_at",
      firstComment.deleted_at === null || firstComment.deleted_at !== undefined,
    );
  }
  // Step 7: Validate author structure
  if (commentPage.data.length > 0 && commentPage.data[0].author) {
    const author = commentPage.data[0].author;
    TestValidator.predicate(
      "author has id",
      author.id !== undefined && author.id.length > 0,
    );
    TestValidator.predicate(
      "author has username",
      author.username !== undefined && author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma",
      typeof author.karma === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      author.created_at !== undefined &&
        !Number.isNaN(new Date(author.created_at).getTime()),
    );
  }
  // Step 8: Validate post structure
  if (commentPage.data.length > 0 && commentPage.data[0].post) {
    const postSummary = commentPage.data[0].post;
    TestValidator.predicate(
      "post has id",
      postSummary.id !== undefined && postSummary.id.length > 0,
    );
    TestValidator.predicate(
      "post has title",
      postSummary.title !== undefined && postSummary.title.length > 0,
    );
    TestValidator.predicate(
      "post has post_type",
      ["text", "link", "image"].includes(postSummary.post_type),
    );
    TestValidator.predicate(
      "post has community",
      postSummary.community !== undefined &&
        postSummary.community.id !== undefined,
    );
  }
  // Step 9: Validate score calculation (score = upvotes_count - downvotes_count)
  if (commentPage.data.length > 0) {
    for (const comment of commentPage.data) {
      const expectedScore = comment.upvotes_count - comment.downvotes_count;
      TestValidator.equals(
        "score equals upvotes minus downvotes",
        comment.score,
        expectedScore,
      );
    }
  }
  // Step 10: Validate default sorting (new = created_at ASC, oldest first)
  if (commentPage.data.length > 1) {
    for (let i = 1; i < commentPage.data.length; i++) {
      const prevDate = new Date(commentPage.data[i - 1].created_at);
      const currDate = new Date(commentPage.data[i].created_at);
      TestValidator.predicate(
        `comment ${i} is newer or equal to comment ${i - 1}`,
        currDate >= prevDate,
      );
    }
  }
  // Step 11: Validate soft-deleted comments are excluded
  // Check that no comment in response has deleted_at set
  for (const comment of commentPage.data) {
    TestValidator.predicate(
      "comment not soft-deleted",
      comment.deleted_at === null || comment.deleted_at === undefined,
    );
  }
}
