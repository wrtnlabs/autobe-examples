import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test creating a text post in a subscribed community.
 *
 * This test validates the primary success path for post creation:
 * 1. Register and authenticate a member account
 * 2. Create a community (member becomes owner and auto-subscribed)
 * 3. Create a text post in that community
 * 4. Validate the post response structure and business logic
 */
export async function test_api_post_creation_text_post_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community (member becomes owner and auto-subscribed)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    postType: "text" as const,
    communityId: community.id,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies IRedditClonePost.ICreate;
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    { body: postBody },
  );
  typia.assert(post);
  // 4. Validate post creation business logic
  TestValidator.equals("post title matches input", post.title, postBody.title);
  TestValidator.equals(
    "post content matches input",
    post.content,
    postBody.content,
  );
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals("post score initialized to zero", post.score, 0);
  TestValidator.equals("post not deleted", post.deleted_at, null);
  TestValidator.equals("post author is member", post.author.id, member.id);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post has no images", post.images.length, 0);
  TestValidator.equals("post has no comments", post.comments_count, 0);
  TestValidator.predicate(
    "post has valid created_at",
    post.created_at.length > 0,
  );
  TestValidator.predicate(
    "post has valid updated_at",
    post.updated_at.length > 0,
  );
}
