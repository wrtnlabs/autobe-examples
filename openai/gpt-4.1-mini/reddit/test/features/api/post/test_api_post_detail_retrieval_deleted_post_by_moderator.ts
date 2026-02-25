import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_detail_retrieval_deleted_post_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  /*
    Test fetching post detail by a moderator when the post has been deleted (soft delete).
    1) Moderator registration,
    2) User registration and community creation,
    3) Moderator creates and then deletes the post,
    4) Moderator retrieves the deleted post.
    Confirm response contains post info including deletion timestamps.
    */
  // Moderator join
  const modConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(modConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: "https://example.com/avatar.jpg",
    },
  });
  typia.assert(moderatorAuthorized);
  modConnection.headers = { Authorization: moderatorAuthorized.token.access };
  // User join
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(2),
      href: "https://example.com/home",
      referrer: "https://example.com/referrer",
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // Create community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // Moderator creates post in community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      modConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // Moderator deletes the post
  const deletedPost =
    await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
      modConnection,
      {
        communityId: community.id,
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // Confirm post deletedAt is non-null
  TestValidator.predicate(
    "post should be soft deleted",
    deletedPost.deletedAt !== null,
  );
  // Retrieve post detail as moderator
  const retrievedPost =
    await api.functional.communityPlatform.moderator.posts.at(modConnection, {
      postId: post.id,
    });
  typia.assert(retrievedPost);
  // Confirm deletedAt timestamp matches
  TestValidator.equals(
    "deleted post deletedAt matches",
    retrievedPost.deletedAt,
    deletedPost.deletedAt,
  );
  // Confirm other key fields unchanged
  TestValidator.equals("post id matches", retrievedPost.id, post.id);
  TestValidator.equals(
    "post communityId matches",
    retrievedPost.communityId,
    community.id,
  );
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "post postType matches",
    retrievedPost.postType,
    post.postType,
  );
}
