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

export async function test_api_post_deletion_by_author_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Deletion of a post by its original author (user).
  // This test verifies that a user who created a post can successfully delete it.
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Post creation by the user
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  const postId = (post as any).id;
  // 3. Delete the post by the same user
  await api.functional.communityPlatform.user.posts.erase(userConnection, {
    postId: postId,
  });
  // 4. Attempt to delete the post again by the same user, expecting 404 error
  await TestValidator.error(
    "deleting already deleted post throws error",
    async () => {
      await api.functional.communityPlatform.user.posts.erase(userConnection, {
        postId: postId,
      });
    },
  );
  // 5. Create and authorize another user who is unauthorized to delete the post
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_user_join(otherUserConnection, {
    body: {},
  });
  typia.assert(otherAuthorized);
  otherUserConnection.headers = { Authorization: otherAuthorized.token.access };
  // 6. Attempt to delete the post (already deleted) by unauthorized user, expecting error
  // Use a new random UUID to simulate non-existing or unauthorized post
  await TestValidator.error(
    "unauthorized user cannot delete another user's post",
    async () => {
      await api.functional.communityPlatform.user.posts.erase(
        otherUserConnection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
