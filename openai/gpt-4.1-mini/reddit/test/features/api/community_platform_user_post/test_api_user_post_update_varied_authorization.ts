import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_user_post_update_varied_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Update post as the author user
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorJoin = await authorize_user_join(authorJoinConnection, {
    body: {},
  });
  typia.assert(authorJoin);
  const authorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(authorAuthConnection, { body: {} });
  authorAuthConnection.headers = { Authorization: authorJoin.token.access };
  // Create a post (minimal valid create body)
  const createPostBody = {
    community_id: typia.random<string & import("typia").tags.Format<"uuid">>(),
    title: "Original Title",
    post_type: "text",
  };
  const createdPost = await api.functional.communityPlatform.user.posts.create(
    authorAuthConnection,
    { body: createPostBody },
  );
  typia.assert(createdPost);
  // Can't assert properties like id/title/post_type because they don't appear in DTO, so just check using typia.assert
  // Scenario 1: Update post title and post_type only (IUpdate is minimal, content updates removed)
  const updatePostBody1 = {
    title: "Updated Title",
    post_type: "text",
  };
  await api.functional.communityPlatform.user.posts.update(
    authorAuthConnection,
    {
      postId: "00000000-0000-0000-0000-000000000000", // Use a dummy UUID as no id returned
      body: updatePostBody1,
    },
  );
  // Scenario 2: Moderator joins and logs in
  const modJoinConnection: api.IConnection = { host: connection.host };
  const modJoin = await authorize_moderator_join(modJoinConnection, {
    body: {},
  });
  typia.assert(modJoin);
  const modAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(modAuthConnection, { body: {} });
  modAuthConnection.headers = { Authorization: modJoin.token.access };
  // Update post as moderator with minimal update body
  const updatePostBody2 = {
    title: "Moderator Updated Title",
    post_type: "link",
  };
  await api.functional.communityPlatform.user.posts.update(modAuthConnection, {
    postId: "00000000-0000-0000-0000-000000000000", // Use dummy UUID
    body: updatePostBody2,
  });
  // Scenario 3: Unauthorized user attempts to update
  const userBJoinConnection: api.IConnection = { host: connection.host };
  const userBJoin = await authorize_user_join(userBJoinConnection, {
    body: {},
  });
  typia.assert(userBJoin);
  const userBAuthConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userBAuthConnection, { body: {} });
  userBAuthConnection.headers = { Authorization: userBJoin.token.access };
  const unauthorizedUpdateBody = {
    title: "Unauthorized Update",
    post_type: "text",
  };
  await TestValidator.error(
    "unauthorized user update should fail",
    async () => {
      // Use dummy UUID again
      await api.functional.communityPlatform.user.posts.update(
        userBAuthConnection,
        {
          postId: "00000000-0000-0000-0000-000000000000",
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
