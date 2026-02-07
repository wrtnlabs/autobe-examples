import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_avatar_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const userAuthorized = await authorize_user_join(userConnection, {
    body: userCreds,
  });
  typia.assert(userAuthorized);
  // 2. Verify initial avatar state (should be null/undefined)
  const initialProfile =
    await api.functional.redditPlatform.user.profile.avatar.updateAvatar(
      userConnection,
      {
        body: {},
      } satisfies IRedditPlatformUserProfile.IUpdate,
    );
  typia.assert(initialProfile);
  // 3. Set an avatar first to ensure there's something to clear
  const avatarUrl = "https://example.com/avatar.png";
  const avatarSetProfile =
    await api.functional.redditPlatform.user.profile.avatar.updateAvatar(
      userConnection,
      {
        body: {
          avatar_url: avatarUrl,
        } satisfies IRedditPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(avatarSetProfile);
  // 4. Clear the avatar by setting it to null
  const clearedProfile =
    await api.functional.redditPlatform.user.profile.avatar.updateAvatar(
      userConnection,
      {
        body: {
          avatar_url: null,
        } satisfies IRedditPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(clearedProfile);
}

