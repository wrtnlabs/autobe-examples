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

export async function test_api_post_deletion_unauthorized_attempt(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized deletion attempt of a post by a non-author, non-moderator user.
  // This test verifies the API returns proper authorization error (403 Forbidden) when a user who
  // is not the author or a community moderator attempts to delete a post.
  // Create first user and authorize
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, { body: {} });
  userAConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  // Create a post as first user
  const post = await api.functional.communityPlatform.user.posts.create(
    userAConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // Create second user and authorize
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, { body: {} });
  userBConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // Attempt to delete post by second user (unauthorized)
  await TestValidator.httpError(
    "unauthorized post deletion returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.user.posts.erase(userBConnection, {
        postId: typia.assert<string>((post as any).id),
      });
    },
  );
  // Verify the post still exists by attempting to delete with author user, should not throw
  await api.functional.communityPlatform.user.posts.erase(userAConnection, {
    postId: typia.assert<string>((post as any).id),
  });
}
