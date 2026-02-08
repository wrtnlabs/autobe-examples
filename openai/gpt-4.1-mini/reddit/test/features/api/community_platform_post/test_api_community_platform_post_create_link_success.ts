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

export async function test_api_community_platform_post_create_link_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful creation of a link post with a valid URL in a subscribed community by an authenticated user. It verifies link post-specific validations and the one-to-one relation handling of link content in the database.
  // 1. User joins the platform by registering an account
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare post creation body of type 'link'
  // Since community id is mandatory, generate a random UUID-like string for demo
  // Post title is random paragraph
  // post_type must be the exact discriminator value for link post
  // link must be a valid URL string
  const createBody: ICommunityPlatformPost.ICreate = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "link",
    link: `https://${RandomGenerator.alphabets(10)}.com/${RandomGenerator.alphabets(5)}`,
  };
  // 3. Create link post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: createBody,
    },
  );
  typia.assert(post);
  // 4. Validate that returned post has correct post_type and link
  const linkPost = post as any;
  TestValidator.equals("post_type is link", linkPost.post_type, "link");
  TestValidator.predicate(
    "post has non-empty link",
    typeof linkPost.link === "string" && linkPost.link.length > 0,
  );
  void TestValidator.predicate(
    "link starts with http",
    linkPost.link.startsWith("http://") || linkPost.link.startsWith("https://"),
  );
}
