import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_banned_user_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "securePassword123",
      displayName: RandomGenerator.name(1),
    },
  });
  typia.assert(admin);
  // 2. Generate a random UUID to simulate an existing banned user ID
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve banned user details by ID
  const bannedUser =
    await api.functional.communityPlatform.admin.banned_users.at(
      adminConnection,
      {
        id: bannedUserId,
      },
    );
  // 4. Validate the response structure - typia.assert covers complete validation
  typia.assert(bannedUser);
  // 5. Confirm the ID matches requested ID
  TestValidator.equals(
    "bannedUser id matches request",
    bannedUser.id,
    bannedUserId,
  );
}
