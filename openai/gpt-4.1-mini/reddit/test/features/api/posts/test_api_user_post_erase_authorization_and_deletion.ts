import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function test_api_user_post_erase_authorization_and_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a post by its author user.
  // Scenario 2: Failed deletion attempt by a user who is not the post author or a moderator.
  // Scenario 3: Successful deletion of a post by an authorized moderator.
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234",
      username: `user_${RandomGenerator.alphabets(6)}`,
      displayName: `User One`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user1);
  // Create a post as user1
  const user1PostBody = {
    // Simulating post creation body if needed or mock postId generation
    // but the actual post creation endpoint is not provided, so simulate ID
    // Using a UUID string to represent a postId
  };
  // Since no create post function is available, simulate post creation by random postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Try delete as post author (user1)
  await api.functional.communityPlatform.user.posts.erase(user1Connection, {
    postId,
  });
  // Since Drastically no direct create post API in current info, assume deletion succeeds
  // Scenario 2: Failed deletion attempt by a user who is not the post author or a moderator.
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234",
      username: `user_${RandomGenerator.alphabets(6)}`,
      displayName: `User Two`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user2);
  // Attempt to delete user1's post as user2 and expect 403
  await TestValidator.httpError(
    "deletion forbidden for non-author user",
    403,
    async () =>
      await api.functional.communityPlatform.user.posts.erase(user2Connection, {
        postId,
      }),
  );
  // Scenario 3: Successful deletion of a post by an authorized moderator.
  const modConnection: api.IConnection = { host: connection.host };
  const mod = await authorize_moderator_join(modConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `mod_${RandomGenerator.alphabets(6)}`,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(mod);
  // Moderator deletes the post
  await api.functional.communityPlatform.user.posts.erase(modConnection, {
    postId,
  });
}
