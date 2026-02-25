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

/**
 * Scenario 3: Attempt to update text content for a post that is not of type 'text'.
 * 1) User creates a link or image post in a community.
 * 2) User attempts to update the text content via PUT on the text content endpoint.
 * 3) Validate the system returns 404 Not Found indicating the post is not a text post.
 */
export async function test_api_post_text_update_for_non_text_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. User register and login
  const baseConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(baseConnection, {});
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. User creates a non-text post (textType = 'link' or 'image')
  const postType = typia.random<"link" | "image">();
  const postBody =
    postType === "link"
      ? { title: "Link Post", postType, url: "https://example.com" }
      : {
          title: "Image Post",
          postType,
          images: ["https://example.com/image.jpg"],
        };
  // Post creation request
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody as any, // ICommunityPlatformPost.ICreate is union but not available for direct usage, so cast
      },
    );
  typia.assert(post);
  // 4. Prepare text update body
  const updateBody: ICommunityPlatformPostText.IUpdate = {
    content: "This is an attempt to update text content on a non-text post.",
  };
  // 5. Attempt to update text content and expect 404 Not Found error
  await TestValidator.httpError(
    "text update on non-text post should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.texts.updateText(
        userConnection,
        {
          postId: post.id,
          body: updateBody,
        },
      );
    },
  );
}
