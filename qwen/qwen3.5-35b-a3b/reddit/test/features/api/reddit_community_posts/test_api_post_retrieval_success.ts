import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_post_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for post creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a text post in a community
  const postConnection: api.IConnection = { host: connection.host };
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Retrieve the post by ID
  const retrievalConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    retrievalConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 4. Validate response fields
  TestValidator.equals("title matches", retrievedPost.title, post.title);
  TestValidator.equals("post_type is text", retrievedPost.post_type, "text");
  TestValidator.equals(
    "text_content matches",
    retrievedPost.text_content,
    post.text_content,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    post.community.id,
  );
  TestValidator.notEquals("author id differs", retrievedPost.author.id, null);
  TestValidator.notEquals(
    "community name differs",
    retrievedPost.community.name,
    null,
  );
  TestValidator.predicate(
    "vote_score is int32",
    retrievedPost.vote_score >= -2147483648 &&
      retrievedPost.vote_score <= 2147483647,
  );
  TestValidator.predicate(
    "comment_count is int32",
    retrievedPost.comment_count >= -2147483648 &&
      retrievedPost.comment_count <= 2147483647,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedPost.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedPost.updated_at)),
  );
  TestValidator.equals("deleted_at is null", retrievedPost.deleted_at, null);
}
