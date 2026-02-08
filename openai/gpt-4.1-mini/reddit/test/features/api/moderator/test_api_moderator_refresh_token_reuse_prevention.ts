import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_token_reuse_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Use the authorize_moderator_join utility to create and login the moderator
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(authorized);
  // Extract initial refresh token from authorized token
  const initialRefreshToken = authorized.token.refresh;
  // 2. Perform a successful token refresh with the initial refresh token
  const refresh1 = await authorize_moderator_refresh(moderatorConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies ICommunityPlatformModerator.IRefresh,
  });
  typia.assert(refresh1);
  // Extract new refresh token from first refresh response
  const newRefreshToken = refresh1.token.refresh;
  // 3. Attempt to reuse the initial refresh token again - expect failure
  await TestValidator.error(
    "reuse of old refresh token should fail",
    async () => {
      await authorize_moderator_refresh(moderatorConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );
  // 4. Use the new refresh token to perform a valid refresh - should succeed
  const refresh2 = await authorize_moderator_refresh(moderatorConnection, {
    body: {
      refreshToken: newRefreshToken,
    } satisfies ICommunityPlatformModerator.IRefresh,
  });
  typia.assert(refresh2);
  // 5. Attempt to reuse the new refresh token again - expect failure
  await TestValidator.error(
    "reuse of second refresh token should fail",
    async () => {
      await authorize_moderator_refresh(moderatorConnection, {
        body: {
          refreshToken: newRefreshToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );
}
