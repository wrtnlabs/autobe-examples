import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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

export async function test_api_post_text_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an authenticated author user can successfully update the text content of their own text post.
  // Step 1: User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // Step 2: User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Step 3: User creates a text post in the community
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: initialContent,
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // Step 4: User updates the text content of the created post
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody: ICommunityPlatformPostText.IUpdate = {
    content: updatedContent,
  };
  const updatedText =
    await api.functional.communityPlatform.user.posts.texts.updateText(
      userConnection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updatedText);
  // Step 5: Validate the update
  TestValidator.equals(
    "updated content matches",
    updatedText.content,
    updatedContent,
  );
  TestValidator.predicate(
    "updated timestamp is newer",
    new Date(updatedText.updatedAt).getTime() >
      new Date(updatedText.createdAt).getTime(),
  );
  TestValidator.notEquals(
    "content differs from original",
    updatedText.content,
    initialContent,
  );
}
