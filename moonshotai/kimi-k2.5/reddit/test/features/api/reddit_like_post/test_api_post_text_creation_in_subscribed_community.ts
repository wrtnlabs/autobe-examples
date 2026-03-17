import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_text_creation_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe to the community (required for posting privileges)
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 4: Create a text post
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const postExcerpt = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  });
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: postTitle,
        community_id: community.id,
        post_type: "text",
        body: postBody,
        excerpt: postExcerpt,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // Step 5: Validate post response structure
  // Validate postType is 'text'
  TestValidator.equals("post type is text", post.postType, "text");
  // Validate initial voteScore is 0
  TestValidator.equals("initial vote score is 0", post.voteScore, 0);
  // Validate initial commentCount is 0
  TestValidator.equals("initial comment count is 0", post.commentCount, 0);
  // Validate content has text type structure (body and excerpt)
  const textContent = post.content as IRedditLikePostTextContent;
  TestValidator.equals(
    "content body matches input",
    textContent.body,
    postBody,
  );
  TestValidator.equals(
    "content excerpt matches input",
    textContent.excerpt,
    postExcerpt,
  );
  // Validate title matches
  TestValidator.equals("title matches input", post.title, postTitle);
  // Validate author matches authenticated member
  TestValidator.equals(
    "author id matches authenticated member",
    post.author.id,
    authorizedMember.id,
  );
  // Validate community matches created community
  TestValidator.equals(
    "community id matches created community",
    post.community.id,
    community.id,
  );
  // Validate isDeleted is false (active post)
  TestValidator.equals("post is not deleted", post.isDeleted, false);
  // Validate deletedAt is null (not soft-deleted)
  TestValidator.equals("deleted at is null", post.deletedAt, null);
}
