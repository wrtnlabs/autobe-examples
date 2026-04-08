import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_active(
  connection: api.IConnection,
) {
  // 1. Register a new admin account using authorization utility
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create admin-specific connection for retrieve operation using the token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 3. Retrieve the admin account by ID
  const retrievedAdmin = await api.functional.redditCommunity.admin.admins.at(
    adminConnection,
    {
      adminId: adminAuthorized.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate response structure and business rules
  TestValidator.equals(
    "admin ID matches",
    retrievedAdmin.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    adminAuthorized.email,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedAdmin.display_name,
    adminAuthorized.display_name,
  );
  TestValidator.equals("is_active is true", retrievedAdmin.is_active, true);
  TestValidator.equals("deleted_at is null", retrievedAdmin.deleted_at, null);
  // 5. Verify email format via typia.assert() already validates tags.Format<"email"> constraint
  // No need for additional manual format checking
}
