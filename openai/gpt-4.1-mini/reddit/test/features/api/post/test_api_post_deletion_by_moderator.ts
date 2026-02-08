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

export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator account creation and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(moderator);
  // 2. User account creation and login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(user);
  // 3. User creates a post
  const postBody =
    typia.random<ICommunityPlatformPost.ICreate>() satisfies ICommunityPlatformPost.ICreate;
  await api.functional.communityPlatform.user.posts.create(userConnection, {
    body: postBody,
  });
  // 4. Moderator deletes the post with a random UUID (simulate postId)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.user.posts.erase(moderatorConnection, {
    postId: fakePostId,
  });
  // 5. Verify deleting a non-existent post results in HTTP error
  await TestValidator.error(
    "delete non-existent post should error",
    async () =>
      await api.functional.communityPlatform.user.posts.erase(
        moderatorConnection,
        {
          postId: fakePostId,
        },
      ),
  );
}
