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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_update_invalid_post_type_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user via join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {});
  typia.assert(authorizedUser);
  // Prepare user-specific connection with authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a community with the authenticated user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community with valid postType 'text'
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: "Initial Title",
    postType: "text",
  } as ICommunityPlatformPost.ICreate;
  // Typing of postType limited to 'text' | 'link' | 'image', So we comply with that initially
  // As postType is only a subset, we only set minimal properties
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Attempt to update post with invalid unsupported postType value
  // According to DTO, postType?: string | undefined - No literal restriction in type
  // But backend should reject unsupported postType values (not 'text', 'link', 'image')
  const invalidUpdateBody: ICommunityPlatformPost.IUpdate = {
    postType: "unsupportedType",
    title: "Updated Title",
  };
  await TestValidator.error("invalid postType update rejected", async () => {
    await api.functional.communityPlatform.user.posts.update(userConnection, {
      postId: post.id,
      body: invalidUpdateBody,
    });
  });
  // 5. Confirm original post remains unchanged
  // Fetch post again by direct SDK call to get the post
  // However, GET /user/posts/{postId} not available per info, mock read by update with empty
  // We will try to update with empty update body and compare initial values still intact
  const fetchedPost = await api.functional.communityPlatform.user.posts.update(
    userConnection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(fetchedPost);
  TestValidator.equals("post not changed title", fetchedPost.title, post.title);
  TestValidator.equals(
    "post not changed postType",
    fetchedPost.postType,
    post.postType,
  );
}
