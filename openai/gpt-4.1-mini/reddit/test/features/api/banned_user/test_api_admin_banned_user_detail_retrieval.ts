import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_user_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed information of a banned user record by its unique ban ID as an admin.
  // 1. Admin join to authenticate and obtain authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Attach token to the adminConnection headers for authorization
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Retrieve a random bannedUserId to test (simulate or real)
  // We'll use typia.random<string & tags.Format<"uuid">>() to simulate a bannedUserId
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the bannedUsers.at endpoint with the admin connection
  const bannedUser =
    await api.functional.communityPlatform.admin.bannedUsers.at(
      adminConnection,
      {
        bannedUserId: bannedUserId,
      },
    );
  // 4. Validate the response structure and essential properties
  typia.assert(bannedUser);
  // 5. Check that at least basic properties exist and have valid types (if possible)
  // Since properties are not provided in DTO, just assert to ensure type safety
  // We trust typia.assert to perform deep validation according to DTO
}
