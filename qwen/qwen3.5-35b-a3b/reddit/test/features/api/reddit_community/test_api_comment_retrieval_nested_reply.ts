import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_comment_retrieval_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(topLevelComment);
  // 4. Create reply comment (nested under topLevelComment)
  const replyContent = RandomGenerator.paragraph({ sentences: 2 });
  const replyComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: replyContent,
          redditCommunityCommentId: topLevelComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 5. Retrieve the reply comment using public endpoint
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: replyComment.id,
    });
  typia.assert(retrievedComment);
  // 6. Validate reply comment structure
  TestValidator.equals(
    "reply comment id matches",
    retrievedComment.id,
    replyComment.id,
  );
  TestValidator.equals(
    "reply content matches",
    retrievedComment.content,
    replyContent,
  );
  TestValidator.equals("reply author matches", retrievedComment.author, member);
  TestValidator.equals("reply post matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "reply is not top-level (has parent)",
    retrievedComment.parent !== null,
    true,
  );
  // 7. Validate parent reference exists and is correct
  TestValidator.notEquals(
    "parent comment exists",
    retrievedComment.parent,
    null,
  );
  TestValidator.equals(
    "parent id matches",
    retrievedComment.parent!.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "parent content matches",
    retrievedComment.parent!.content,
    topLevelComment.content,
  );
  TestValidator.equals(
    "parent author matches",
    retrievedComment.parent!.author,
    topLevelComment.author,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    retrievedComment.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrievedComment.deleted_at,
    null,
  );
  // 9. Validate vote count
  TestValidator.predicate(
    "vote count is non-negative",
    retrievedComment.votes_count >= 0,
  );
  // 10. Validate parent comment exists (no reply count field in API)
  const topLevelCommentRevalidated =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: topLevelComment.id,
    });
  typia.assert(topLevelCommentRevalidated);
  TestValidator.notEquals(
    "parent comment retrieved successfully",
    topLevelCommentRevalidated,
    null,
  );
}