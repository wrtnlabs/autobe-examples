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

export async function test_api_post_update_image_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set the authorization token in the connection header
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to the community (already subscribed as creator, but explicit for clarity)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create an IMAGE type post
  const originalTitle = RandomGenerator.paragraph({ sentences: 1 });
  const originalImageUri = typia.random<string & tags.Format<"uri">>();
  const originalPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        post_type: "IMAGE",
        community_id: community.id,
        image: {
          fileUri: originalImageUri,
        } satisfies IRedditClonePostImage.ICreate,
      },
    },
  );
  typia.assert(originalPost);
  // Validate original post
  TestValidator.equals("post type is IMAGE", originalPost.post_type, "IMAGE");
  TestValidator.equals("title matches", originalPost.title, originalTitle);
  TestValidator.equals(
    "file_uri matches",
    originalPost.file_uri,
    originalImageUri,
  );
  TestValidator.predicate(
    "author is member",
    originalPost.author.id === memberAuth.id,
  );
  TestValidator.equals(
    "community matches",
    originalPost.community.id,
    community.id,
  );
  // 5. Update the post with new title and new image URI
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedImageUri = typia.random<string & tags.Format<"uri">>();
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: originalPost.id,
      body: {
        title: updatedTitle,
        imageUri: updatedImageUri,
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Validate updated post
  TestValidator.equals(
    "post type remains IMAGE",
    updatedPost.post_type,
    "IMAGE",
  );
  TestValidator.equals("title is updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "file_uri is updated",
    updatedPost.file_uri,
    updatedImageUri,
  );
  TestValidator.notEquals(
    "title changed",
    originalPost.title,
    updatedPost.title,
  );
  TestValidator.notEquals(
    "file_uri changed",
    originalPost.file_uri,
    updatedPost.file_uri,
  );
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedPost.updated_at) > new Date(originalPost.updated_at),
  );
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("id unchanged", updatedPost.id, originalPost.id);
}