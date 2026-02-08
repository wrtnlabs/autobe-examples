import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_banned_user_retrieve_authorized_access_and_not_found_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve existing banned user record by valid bannedUserId
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join utility to register and authenticate admin
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  // The authorize_admin_join utility internally sets the Authorization header
  // Create a valid bannedUserId (random UUID) for the test
  const validBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Fetch banned user record by id
  const bannedUserRecord =
    await api.functional.communityPlatform.admin.community_banned_users.at(
      adminConnection,
      {
        bannedUserId: validBannedUserId,
      },
    );
  typia.assert(bannedUserRecord);
  // Scenario 2: Attempt to fetch with non-existent bannedUserId, expect 404 error
  const nonExistentBannedUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch non-existent bannedUserId",
    404,
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.at(
        adminConnection,
        {
          bannedUserId: nonExistentBannedUserId,
        },
      );
    },
  );
  // Scenario 3: Attempt access without admin authorization (base connection)
  await TestValidator.httpError(
    "access denied without admin authorization",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.at(
        connection,
        {
          bannedUserId: validBannedUserId,
        },
      );
    },
  );
}
