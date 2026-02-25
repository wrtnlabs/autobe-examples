import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
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

export async function test_api_post_images_retrieval_by_moderator_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinOutput = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: userJoinOutput.token.access };
  // 2. Create a moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinOutput = await authorize_moderator_join(
    moderatorConnection,
    { body: {} },
  );
  moderatorConnection.headers = {
    Authorization: moderatorJoinOutput.token.access,
  };
  // 3. Create a community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Create a post of type 'image' in the community as the user
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: typia.random<string & tags.Format<"uri">>(),
    postType: "image",
    images: ArrayUtil.repeat(3, () => ({
      imageUrl: typia.random<string & tags.Format<"uri">>(),
    })),
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
  // 5. Moderator retrieves the images of the created post
  const imagesResponse =
    await api.functional.communityPlatform.moderator.posts.images.atImages(
      moderatorConnection,
      { postId: post.id },
    );
  typia.assert(imagesResponse);
  TestValidator.predicate(
    "images list is not empty",
    imagesResponse.data.length > 0,
  );
  for (const image of imagesResponse.data) {
    typia.assert(image);
    TestValidator.predicate(
      "image.url is valid URI",
      image.imageUrl.startsWith("http") || image.imageUrl.startsWith("https"),
    );
  }
  // 6. Test 404 error when the postId does not exist
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 with non-existent postId",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.posts.images.atImages(
        moderatorConnection,
        { postId: fakePostId },
      ),
  );
}
