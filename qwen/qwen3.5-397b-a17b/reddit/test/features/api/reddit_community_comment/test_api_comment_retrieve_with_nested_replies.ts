import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test successful retrieval of a comment with nested reply structure.
 *
 * Validates the complete comment retrieval flow including member authentication, community creation, post creation, top-level comment creation, nested reply chain creation (4 levels deep), and comment retrieval with full threaded structure. Ensures that the comment endpoint returns all expected fields including author profile, content, vote score, timestamps, parent reference, and recursively nested replies.
 *
 * Special attention is given to verifying that the reply depth is unlimited by creating a chain of 4 nested replies and validating that all replies are returned in the correct hierarchical structure with proper parent references.
 *
 * 1. First member registers and creates a community.
 * 2. First member creates a post in the community.
 * 3. First member creates a top-level comment on the post.
 * 4. Second member registers and creates a reply to the first comment.
 * 5. Second member creates a reply to their own comment (nested reply chain).
 * 6. Third member creates another nested reply to continue the chain.
 * 7. Fourth member creates the final nested reply (4 levels deep).
 * 8. Retrieve the top-level comment and validate all fields including nested replies.
 * 9. Validate reply structure: parent references, author profiles, content, timestamps.
 */
export async function test_api_comment_retrieve_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registers and creates community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 2. First member creates a post in the community
  const post = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 3. First member creates a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          reddit_community_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 4. Second member registers and creates a reply to the first comment
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  const reply1 =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_community_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply1);
  // 5. Second member creates a reply to their own comment (nested reply chain level 2)
  const reply2 =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_community_comment_id: reply1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply2);
  // 6. Third member creates another nested reply (level 3)
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member3Auth);
  const reply3 =
    await generate_random_reddit_community_member_posts_comments_create(
      member3Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_community_comment_id: reply2.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply3);
  // 7. Fourth member creates the final nested reply (level 4)
  const member4Connection: api.IConnection = { host: connection.host };
  const member4Auth = await authorize_member_join(member4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member4Auth);
  const reply4 =
    await generate_random_reddit_community_member_posts_comments_create(
      member4Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_community_comment_id: reply3.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply4);
  // 8. Retrieve the top-level comment with nested replies
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(member1Connection, {
      postId: post.id,
      commentId: topLevelComment.id,
    });
  typia.assert(retrievedComment);
  // 9. Validate comment structure
  // Validate comment id matches
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    topLevelComment.id,
  );
  // Validate author profile
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    member1Auth.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedComment.author.display_name,
    member1Auth.display_name,
  );
  // Validate content
  TestValidator.equals(
    "content matches",
    retrievedComment.content,
    topLevelComment.content,
  );
  // Validate parent is null for top-level comment
  TestValidator.equals(
    "parent is null for top-level",
    retrievedComment.parent,
    null,
  );
  // Validate deleted_at is null for active comment
  TestValidator.equals("deleted_at is null", retrievedComment.deleted_at, null);
  // Validate replies array contains nested replies
  TestValidator.predicate(
    "has at least one reply",
    retrievedComment.replies.length >= 1,
  );
  // Validate first level reply structure
  const firstReply = retrievedComment.replies[0];
  TestValidator.equals("first reply id matches", firstReply.id, reply1.id);
  TestValidator.equals(
    "first reply author username",
    firstReply.author.username,
    member2Auth.username,
  );
  TestValidator.predicate("first reply has parent", firstReply.parent !== null);
  TestValidator.equals(
    "first reply parent id",
    firstReply.parent!.id,
    topLevelComment.id,
  );
  // Validate nested reply chain (4 levels deep)
  TestValidator.predicate(
    "first reply has replies",
    firstReply.replies.length >= 1,
  );
  const secondReply = firstReply.replies[0];
  TestValidator.equals("second reply id matches", secondReply.id, reply2.id);
  TestValidator.predicate(
    "second reply has parent",
    secondReply.parent !== null,
  );
  TestValidator.equals(
    "second reply parent id",
    secondReply.parent!.id,
    reply1.id,
  );
  TestValidator.predicate(
    "second reply has replies",
    secondReply.replies.length >= 1,
  );
  const thirdReply = secondReply.replies[0];
  TestValidator.equals("third reply id matches", thirdReply.id, reply3.id);
  TestValidator.predicate("third reply has parent", thirdReply.parent !== null);
  TestValidator.equals(
    "third reply parent id",
    thirdReply.parent!.id,
    reply2.id,
  );
  TestValidator.predicate(
    "third reply has replies",
    thirdReply.replies.length >= 1,
  );
  const fourthReply = thirdReply.replies[0];
  TestValidator.equals("fourth reply id matches", fourthReply.id, reply4.id);
  TestValidator.predicate(
    "fourth reply has parent",
    fourthReply.parent !== null,
  );
  TestValidator.equals(
    "fourth reply parent id",
    fourthReply.parent!.id,
    reply3.id,
  );
  // Validate all replies have correct author usernames
  TestValidator.equals(
    "first reply author",
    firstReply.author.username,
    member2Auth.username,
  );
  TestValidator.equals(
    "second reply author",
    secondReply.author.username,
    member2Auth.username,
  );
  TestValidator.equals(
    "third reply author",
    thirdReply.author.username,
    member3Auth.username,
  );
  TestValidator.equals(
    "fourth reply author",
    fourthReply.author.username,
    member4Auth.username,
  );
  // Validate content is preserved for all replies
  TestValidator.equals(
    "first reply content",
    firstReply.content,
    reply1.content,
  );
  TestValidator.equals(
    "second reply content",
    secondReply.content,
    reply2.content,
  );
  TestValidator.equals(
    "third reply content",
    thirdReply.content,
    reply3.content,
  );
  TestValidator.equals(
    "fourth reply content",
    fourthReply.content,
    reply4.content,
  );
}