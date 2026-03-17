import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_retrieval_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for test data creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community (assuming community creation endpoint exists)
  // Since community creation isn't in the provided SDK, we'll need to work with
  // the assumption that a community exists or can be created through setup
  // For a complete E2E test, we'd need community creation capabilities
  // For this test, we'll use the generate_random_reddit_platform_member_posts_create
  // which should handle community creation internally if needed
  // Create post using the generation utility (handles community setup)
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Retrieve comment publicly (without authentication)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedComment =
    await api.functional.redditPlatform.posts.comments.at(publicConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // 5. Validate response structure and data integrity
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    comment.body,
  );
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    member.username,
  );
  TestValidator.predicate(
    "has vote score",
    typeof retrievedComment.voteScore === "number",
  );
  TestValidator.predicate(
    "has created timestamp",
    !!retrievedComment.createdAt,
  );
  TestValidator.predicate(
    "has updated timestamp",
    !!retrievedComment.updatedAt,
  );
  TestValidator.predicate("author has id", !!retrievedComment.author.id);
  TestValidator.predicate(
    "author has karma score",
    typeof retrievedComment.author.karma_score === "number",
  );
  // 6. Test with nested comment (reply)
  const replyComment =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: comment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // 7. Retrieve the reply comment and validate parent reference
  const retrievedReply = await api.functional.redditPlatform.posts.comments.at(
    publicConnection,
    {
      postId: post.id,
      commentId: replyComment.id,
    },
  );
  typia.assert(retrievedReply);
  TestValidator.equals(
    "reply has parent",
    retrievedReply.parent?.id,
    comment.id,
  );
  TestValidator.equals(
    "parent body matches",
    retrievedReply.parent?.body,
    comment.body,
  );
  TestValidator.equals(
    "parent author matches",
    retrievedReply.parent?.author.username,
    member.username,
  );
  // 8. Verify guest user (no authentication) can also retrieve comments
  const guestConnection: api.IConnection = { host: connection.host };
  const guestRetrieved = await api.functional.redditPlatform.posts.comments.at(
    guestConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(guestRetrieved);
  TestValidator.equals(
    "guest can retrieve comment",
    guestRetrieved.id,
    comment.id,
  );
  TestValidator.equals(
    "guest sees same body",
    guestRetrieved.body,
    comment.body,
  );
}