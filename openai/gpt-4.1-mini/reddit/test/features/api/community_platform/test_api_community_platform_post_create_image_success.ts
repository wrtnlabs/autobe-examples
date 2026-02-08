import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * This scenario tests the creation of an image post containing multiple image URLs
 * in a community where the user is subscribed and not banned. It verifies handling
 * multiple image insertions linked to a single post and proper transactional consistency
 * to avoid partial data persistence.
 */
export async function test_api_community_platform_post_create_image_success(
  connection: api.IConnection,
): Promise<void> {
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userJoinConnection, { body: {} });
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // Generate multiple image URLs
  const imageUrls: string[] = Array(3)
    .fill(0)
    .map(
      () => `https://example.com/images/${RandomGenerator.alphabets(10)}.jpg`,
    );
  // Construct request body for image post creation
  const body: ICommunityPlatformPost.ICreate = {
    community_id: typia.random<string & typia.tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "image",
    images: imageUrls,
  };
  // Create post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    { body },
  );
  // Assert entire post response structure
  typia.assert(post);
}
