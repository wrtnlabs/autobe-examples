import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_list_primary_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and create post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  // 2. Create second member for writing comments
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 3. Create third member for writing more comments
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member3Auth);
  // 4. Create a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 5. Create post using first member's connection
  const post = await api.functional.redditCommunity.member.posts.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create multiple top-level comments by different members
  const comment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      member1Connection,
      {
        postId: post.id,
        body: {
          content: "This is the first comment by member 1",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      member2Connection,
      {
        postId: post.id,
        body: {
          content: "This is the second comment by member 2",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await api.functional.redditCommunity.member.posts.comments.create(
      member3Connection,
      {
        postId: post.id,
        body: {
          content: "This is the third comment by member 3",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 7. Create a reply to comment1
  const reply1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      member2Connection,
      {
        postId: post.id,
        body: {
          content: "This is a reply to the first comment",
          redditCommunityCommentId: comment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply1);
  // 8. Create another reply to reply1 (nested reply)
  const reply2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      member3Connection,
      {
        postId: post.id,
        body: {
          content: "This is a nested reply to the nested reply",
          redditCommunityCommentId: reply1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply2);
  // 9. Execute: Retrieve comments for the post
  const resultConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.redditCommunity.posts.comments.index(
    resultConnection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(response);
  // 10. Validate response structure - data array exists
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // 11. Validate all comments on the post are included
  TestValidator.equals("all comments included", response.data.length, 5);
  // 12. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data count",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals("pagination pages is 1", response.pagination.pages, 1);
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  // 13. Validate is_top_level flags
  const topLevelComments = response.data.filter((c) => c.is_top_level === true);
  const replyComments = response.data.filter((c) => c.is_top_level === false);
  TestValidator.equals("top-level comments count", topLevelComments.length, 3);
  TestValidator.equals("reply comments count", replyComments.length, 2);
  // 14. Validate reply_count
  const comment1WithReplies = response.data.find((c) => c.id === comment1.id);
  const comment2WithReplies = response.data.find((c) => c.id === comment2.id);
  const comment3WithReplies = response.data.find((c) => c.id === comment3.id);
  const reply1WithReplies = response.data.find((c) => c.id === reply1.id);
  const reply2WithReplies = response.data.find((c) => c.id === reply2.id);
  TestValidator.equals(
    "comment1 reply count",
    comment1WithReplies?.reply_count,
    2,
  );
  TestValidator.equals(
    "comment2 reply count",
    comment2WithReplies?.reply_count,
    0,
  );
  TestValidator.equals(
    "comment3 reply count",
    comment3WithReplies?.reply_count,
    0,
  );
  TestValidator.equals("reply1 reply count", reply1WithReplies?.reply_count, 1);
  TestValidator.equals("reply2 reply count", reply2WithReplies?.reply_count, 0);
  // 15. Validate deleted_at is NULL for all comments
  for (const comment of response.data) {
    TestValidator.equals(
      `comment ${comment.id} deleted_at is NULL`,
      comment.deleted_at,
      null,
    );
  }
  // 16. Validate timestamps are in ISO 8601 format
  for (const comment of response.data) {
    TestValidator.predicate(
      "comment created_at is valid ISO 8601",
      !isNaN(Date.parse(comment.created_at)),
    );
    TestValidator.predicate(
      "comment updated_at is valid ISO 8601",
      !isNaN(Date.parse(comment.updated_at)),
    );
  }
  // 17. Validate author usernames are non-empty strings
  for (const comment of response.data) {
    TestValidator.predicate(
      "comment author username is valid",
      comment.author.username.length > 0,
    );
  }
  // 18. Validate vote counts are valid integers
  for (const comment of response.data) {
    TestValidator.predicate(
      "comment vote_count is valid integer",
      Number.isInteger(comment.vote_count),
    );
  }
  // 19. Validate result ordering by created_at descending
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      `comment ${i} created_at <= previous comment created_at`,
      new Date(response.data[i].created_at) <=
        new Date(response.data[i - 1].created_at),
    );
  }
}
