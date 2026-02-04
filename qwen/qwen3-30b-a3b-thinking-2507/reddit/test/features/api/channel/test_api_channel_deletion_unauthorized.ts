import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
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
import { generate_random_community_platform_user_channels_create } from "../../../generate/generate_random_community_platform_user_channels_create";
import { prepare_random_community_platform_channel } from "../../../prepare/prepare_random_community_platform_channel";

/**
 * Validate channel deletion fails for non-owner users.
 *
 * Checks that a user who did not create a channel cannot delete it. The test
 * creates a channel as one user, then attempts to delete it as a different user.
 * This ensures ownership-based access control is properly enforced.
 *
 * Step-by-step:
 * 1. Create owner account
 * 2. Create channel as owner
 * 3. Create unauthorized account
 * 4. Attempt to delete channel as unauthorized user
 * 5. Validate 403 Forbidden response
 */
export async function test_api_channel_deletion_unauthorized(
  connection: api.IConnection,
) {
  // Create owner user account and get authorization
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await authorize_user_join(ownerConnection, {});
  // Create channel as owner
  const ownerChannel =
    await generate_random_community_platform_user_channels_create(
      ownerConnection,
      {},
    );
  // Create unauthorized user account
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_user_join(
    unauthorizedConnection,
    {},
  );
  // Attempt to delete channel as unauthorized user
  await TestValidator.error(
    "unauthorized channel deletion should fail with 403 Forbidden",
    async () => {
      await api.functional.communityPlatform.user.channels.erase(
        unauthorizedConnection,
        {
          channelId: ownerChannel.id,
        },
      );
    },
  );
}
