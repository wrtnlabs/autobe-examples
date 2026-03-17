import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_retrieval_link_and_image_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first community for link post
  const community1 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community1);
  // 3. Subscribe to first community
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // 4. Create link post with URL content
  const linkUrl = typia.random<string & tags.Format<"uri">>();
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "LINK" as const,
        community_id: community1.id,
        link: {
          url: linkUrl,
        } satisfies IRedditClonePostLink.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 5. Create second community for image post
  const community2 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community2);
  // 6. Subscribe to second community
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 7. Create image post with file URI content
  const imageUri = typia.random<string & tags.Format<"uri">>();
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "IMAGE" as const,
        community_id: community2.id,
        image: {
          fileUri: imageUri,
        } satisfies IRedditClonePostImage.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 8. Retrieve link post and validate
  const retrievedLinkPost = await api.functional.redditClone.posts.at(
    memberConnection,
    {
      postId: linkPost.id,
    },
  );
  typia.assert(retrievedLinkPost);
  // Validate link post type-specific fields
  TestValidator.equals("link post_type", retrievedLinkPost.post_type, "LINK");
  TestValidator.equals("link url matches", retrievedLinkPost.url, linkUrl);
  TestValidator.equals("link body is null", retrievedLinkPost.body, null);
  TestValidator.equals(
    "link file_uri is null",
    retrievedLinkPost.file_uri,
    null,
  );
  TestValidator.equals("link vote_score is 0", retrievedLinkPost.vote_score, 0);
  TestValidator.equals(
    "link comment_count is 0",
    retrievedLinkPost.comment_count,
    0,
  );
  TestValidator.equals(
    "link author username matches",
    retrievedLinkPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "link community name matches",
    retrievedLinkPost.community.name,
    community1.name,
  );
  // 9. Retrieve image post and validate
  const retrievedImagePost = await api.functional.redditClone.posts.at(
    memberConnection,
    {
      postId: imagePost.id,
    },
  );
  typia.assert(retrievedImagePost);
  // Validate image post type-specific fields
  TestValidator.equals(
    "image post_type",
    retrievedImagePost.post_type,
    "IMAGE",
  );
  TestValidator.equals(
    "image file_uri matches",
    retrievedImagePost.file_uri,
    imageUri,
  );
  TestValidator.equals("image body is null", retrievedImagePost.body, null);
  TestValidator.equals("image url is null", retrievedImagePost.url, null);
  TestValidator.equals(
    "image vote_score is 0",
    retrievedImagePost.vote_score,
    0,
  );
  TestValidator.equals(
    "image comment_count is 0",
    retrievedImagePost.comment_count,
    0,
  );
  TestValidator.equals(
    "image author username matches",
    retrievedImagePost.author.username,
    member.username,
  );
  TestValidator.equals(
    "image community name matches",
    retrievedImagePost.community.name,
    community2.name,
  );
}
