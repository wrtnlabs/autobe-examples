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
 * Test successful creation of a text post in a subscribed community where user is authorized and not banned.
 */
export async function test_api_community_platform_post_create_text_success(
  connection: api.IConnection,
): Promise<void> {
  // --- Step 1: User joins the platform ---
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  // Upgrade connection with authorization token
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // --- Step 2: Create a text post in a community ---
  // As no community creation API is provided, use a random UUID for community_id
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Compose a post create request for a text post
  const createPostBody: ICommunityPlatformPost.ICreate = {
    community_id: communityId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "text",
    text: {
      content: RandomGenerator.paragraph({ sentences: 5 }),
    },
  };
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: createPostBody,
    },
  );
  typia.assert(post);
  // Cannot assert specific properties of post as ICommunityPlatformPost is empty type
}
