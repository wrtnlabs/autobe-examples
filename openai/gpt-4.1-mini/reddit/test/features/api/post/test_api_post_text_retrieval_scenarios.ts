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

export async function test_api_post_text_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(connection, {});
  userConnection.headers = {
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // 2. Create a community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Scenario 1: Create a text post in the community
  const textPostBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "text",
    // Assuming post content field exists for text post creation
    content: RandomGenerator.content({ paragraphs: 1 }),
  };
  const textPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: textPostBody,
      },
    );
  typia.assert(textPost);
  // 4. Scenario 1: Retrieve full text content of the text post
  const textContent =
    await api.functional.communityPlatform.user.posts.texts.atText(
      userConnection,
      {
        postId: textPost.id,
      },
    );
  typia.assert(textContent);
  TestValidator.equals(
    "text content postId matches",
    textContent.communityPlatformPostId,
    textPost.id,
  );
  TestValidator.equals(
    "text content exists",
    typeof textContent.content,
    "string",
  );
  TestValidator.predicate(
    "content timestamps are present",
    textContent.createdAt !== undefined && textContent.updatedAt !== undefined,
  );
  TestValidator.equals(
    "deletion timestamp is null",
    null,
    textContent.deletedAt === null ? null : undefined,
  );
  // 5. Scenario 2: Create a link post (non-text) in the same community
  const linkPostBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "link",
    // Assuming url field exists for link post creation
    url: "https://example.com/test",
  };
  const linkPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: linkPostBody,
      },
    );
  typia.assert(linkPost);
  // 6. Scenario 2: Attempt to retrieve text content of non-text post
  await TestValidator.httpError(
    "text retrieval on non-text post should fail",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.texts.atText(
        userConnection,
        {
          postId: linkPost.id,
        },
      );
    },
  );
  // 7. Scenario 3: Authorization checks
  // 7-1. Unauthenticated access attempt
  await TestValidator.httpError(
    "unauthenticated user cannot retrieve text content",
    401,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.user.posts.texts.atText(
        unauthorizedConnection,
        { postId: textPost.id },
      );
    },
  );
  // 7-2. Authenticated user access
  const user2Authorized = await authorize_user_join(connection, {});
  const user2Connection: api.IConnection = { host: connection.host };
  user2Connection.headers = {
    Authorization: `Bearer ${user2Authorized.token.access}`,
  };
  const textContentUser2 =
    await api.functional.communityPlatform.user.posts.texts.atText(
      user2Connection,
      { postId: textPost.id },
    );
  typia.assert(textContentUser2);
  TestValidator.equals(
    "authenticated user can retrieve text content",
    textContentUser2.communityPlatformPostId,
    textPost.id,
  );
  // 7-3. Moderator access (assuming moderator login utility is available)
  // If moderator authorization utility is not given, skip moderator test
  // Here, we skip moderator tests because no moderator utility function provided
}
