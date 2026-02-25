import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_hierarchy_prevents_cross_post_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: api.functional.redditCommunity.auth.member.join.Response =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create two distinct communities
  const communityAConnection: api.IConnection = { host: connection.host };
  communityAConnection.headers = memberConnection.headers;
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      communityAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  const communityBConnection: api.IConnection = { host: connection.host };
  communityBConnection.headers = memberConnection.headers;
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      communityBConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 3. Create a post in community A
  const postAConnection: api.IConnection = { host: connection.host };
  postAConnection.headers = memberConnection.headers;
  const postA = await generate_random_reddit_community_member_posts_create(
    postAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: communityA.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  // 4. Create a post in community B
  const postBConnection: api.IConnection = { host: connection.host };
  postBConnection.headers = memberConnection.headers;
  const postB = await generate_random_reddit_community_member_posts_create(
    postBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: communityB.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  // 5. Create a comment on post B (this is the comment that belongs to post B)
  const commentOnPostBConnection: api.IConnection = { host: connection.host };
  commentOnPostBConnection.headers = memberConnection.headers;
  const commentOnPostB =
    await generate_random_reddit_community_member_posts_comments_create(
      commentOnPostBConnection,
      {
        params: { postId: postB.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(commentOnPostB);
  // 6. Try to get the comment hierarchy using comment's ID with the wrong post ID (post A's ID)
  // This simulates cross-post access attempt: comment belongs to post B, but request uses post A's ID
  try {
    await api.functional.redditCommunity.posts.comments.at(memberConnection, {
      postId: postA.id, // Wrong post ID - comment belongs to post B
      commentId: commentOnPostB.id,
    });
    // FAIL - Should have thrown an error
    throw new Error(
      "Expected 404 Not Found when accessing comment with wrong post ID",
    );
  } catch (error) {
    // Validate that we got 404 Not Found as expected
    typia.assertGuard<HttpError>(error);
    TestValidator.equals("Status code should be 404", error.status, 404);
    TestValidator.equals(
      "Error path should match expected",
      error.path,
      `/redditCommunity/posts/${encodeURIComponent(postA.id)}/comments/${encodeURIComponent(commentOnPostB.id)}`,
    );
  }
}