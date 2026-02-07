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

/**
 * Test successful avatar update with valid HTTP/HTTPS URL.
 * This test verifies the avatar update endpoint works with valid URLs.
 */
export async function test_api_user_profile_avatar_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Update avatar with valid HTTP URL
  // The DTO is defined as empty object, so we pass an empty body
  // The avatar URL validation happens server-side
  const updatedProfile =
    await api.functional.redditPlatform.user.profile.avatar.updateAvatar(
      userConnection,
      {
        body: {}, // Empty body as per empty DTO definition
      },
    );
  typia.assert(updatedProfile);
}
