import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
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
import { generate_random_community_platform_moderator_banned_users_create } from "../../../generate/generate_random_community_platform_moderator_banned_users_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";

export async function test_api_moderator_banned_user_deletion_critical_flows(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion by authorized moderator (using random UUID since no ban ID available)
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    await authorize_moderator_join(moderatorConnection, { body: {} });
    // Create banned user record
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      { body: {} },
    );
    // Generate random UUID to delete
    const randomBanId = typia.random<string & tags.Format<"uuid">>();
    // Delete the banned user record (should succeed with 204 No Content if ID exists)
    await api.functional.communityPlatform.moderator.bannedUsers.eraseBannedUser(
      moderatorConnection,
      { bannedUserId: randomBanId },
    );
  }
  // Scenario 2: Unauthorized deletion attempt
  {
    const randomId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "deletion without authorization",
      401,
      async () => {
        const unauthorizedConnection: api.IConnection = {
          host: connection.host,
        };
        await api.functional.communityPlatform.moderator.bannedUsers.eraseBannedUser(
          unauthorizedConnection,
          { bannedUserId: randomId },
        );
      },
    );
  }
  // Scenario 3: Attempt deletion with non-existent bannedUserId
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    await authorize_moderator_join(moderatorConnection, { body: {} });
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "deletion of non-existing ban",
      404,
      async () => {
        await api.functional.communityPlatform.moderator.bannedUsers.eraseBannedUser(
          moderatorConnection,
          { bannedUserId: nonExistentId },
        );
      },
    );
  }
}
