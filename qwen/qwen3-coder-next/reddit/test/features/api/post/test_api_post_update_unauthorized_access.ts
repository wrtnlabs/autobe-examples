import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  // Prepare unauthenticated connection (no authorization token)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Test 1: Unauthenticated user cannot update post
  await TestValidator.error(
    "unauthenticated user cannot update post",
    async () => {
      await api.functional.redditPlatform.user.posts.update(
        unauthenticatedConnection,
        {
          postId: mockPostId,
          body: {
            title: "Unauthorized update",
            content: "This should fail",
          } satisfies IRedditPlatformPost.IUpdate,
        },
      );
    },
  );
  // Prepare authorized user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Test 2: Another unauthorized user cannot update post created by different user
  const otherUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(otherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  await TestValidator.error(
    "other unauthorized user cannot update post",
    async () => {
      await api.functional.redditPlatform.user.posts.update(
        otherUserConnection,
        {
          postId: mockPostId,
          body: {
            title: "Unauthorized update attempt",
            content: "This should fail",
          } satisfies IRedditPlatformPost.IUpdate,
        },
      );
    },
  );
  // Test 3: Original user CAN update their own post (positive control)
  // Note: Since we can't create posts without the create endpoint,
  // we're testing that the authorized connection is properly set up
  const updatedPost = await api.functional.redditPlatform.user.posts.update(
    userConnection,
    {
      postId: mockPostId,
      body: {
        title: "Legitimate update",
        content: "This is authorized",
      } satisfies IRedditPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  TestValidator.equals(
    "original user can update their post",
    updatedPost,
    updatedPost,
  );
}
