import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_retrieval_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the created community
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a text-type post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postTextContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const createdPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: postTitle,
          contentType: "text",
          textContent: postTextContent,
          linkUrl: null,
          imageUrl: null,
        },
      },
    );
  typia.assert(createdPost);
  // 5. Retrieve the post without authentication (public content)
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // Validate post properties
  TestValidator.equals("post id matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, postTitle);
  TestValidator.equals(
    "content_type is text",
    retrievedPost.content_type,
    "text",
  );
  TestValidator.equals(
    "text_content matches",
    retrievedPost.text_content,
    postTextContent,
  );
  TestValidator.equals("link_url is null", retrievedPost.link_url, null);
  TestValidator.equals("image_url is null", retrievedPost.image_url, null);
  TestValidator.equals("score is 1 (self-upvote)", retrievedPost.score, 1);
  TestValidator.equals("comment_count is 0", retrievedPost.comment_count, 0);
  TestValidator.equals("deleted_at is null", retrievedPost.deleted_at, null);
  // Validate author info
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    authorized.member.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedPost.author.display_name,
    authorized.member.display_name,
  );
  // Validate community info
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedPost.community.description,
    community.description,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedPost.created_at !== null && retrievedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedPost.updated_at !== null && retrievedPost.updated_at !== undefined,
  );
}
