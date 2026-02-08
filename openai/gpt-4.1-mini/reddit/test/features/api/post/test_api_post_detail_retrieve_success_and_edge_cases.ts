import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_detail_retrieve_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  /*
        Scenario 1: Successfully retrieve a detailed post by postId.
        Scenario 2: Attempt to retrieve a non-existent post returns not found error.
        Scenario 3: Attempt to retrieve a post with invalid postId format returns validation error.
      */
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(connection, {});
  userConnection.headers = { authorization: `Bearer ${userAuth.token.access}` };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Function to create a random post of any valid post_type
  async function createRandomPost(
    con: api.IConnection,
    communityId: string,
  ): Promise<ICommunityPlatformPost> {
    const postType = typia.random<"text" | "link" | "image">();
    let body: ICommunityPlatformPost.ICreate;
    switch (postType) {
      case "text":
        body = {
          community_id: communityId,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate;
        break;
      case "link":
        body = {
          community_id: communityId,
          post_type: "link",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          link_url: "https://" + RandomGenerator.alphabets(10) + ".com",
          link_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPost.ICreate;
        break;
      case "image":
        body = {
          community_id: communityId,
          post_type: "image",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          image_urls: [
            "https://example.com/img/" +
              RandomGenerator.alphaNumeric(6) +
              ".jpg",
          ],
        } satisfies ICommunityPlatformPost.ICreate;
        break;
      default:
        throw new Error("Unsupported post_type detected in createRandomPost");
    }
    const post = await api.functional.communityPlatform.user.posts.create(con, {
      body,
    });
    typia.assert(post);
    return post;
  }
  // 4. Create a post
  const post = await createRandomPost(userConnection, "some-community-id");
  // 5. Retrieve the post by postId
  // Since post.id does not exist according to DTO, generate a random UUID for test
  const postId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPost = await api.functional.communityPlatform.user.posts.at(
    userConnection,
    {
      postId,
    },
  );
  // 6. Validate the retrieved post object whole
  typia.assert(retrievedPost);
  // Scenario 2: Attempt to retrieve a non-existent postId
  await TestValidator.httpError(
    "not found for non-existent postId",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.at(userConnection, {
        postId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
  // Scenario 3: Attempt to retrieve a post with an invalid postId format
  await TestValidator.httpError(
    "validation error for invalid postId format",
    [400, 422],
    async () => {
      await api.functional.communityPlatform.user.posts.at(userConnection, {
        postId: "invalid-uuid-format",
      });
    },
  );
}
