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

export async function test_api_admin_retrieve_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an admin user to have required authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create another admin account
  const inactiveAdminConnection: api.IConnection = { host: connection.host };
  const inactiveAdminAuth = await authorize_admin_join(
    inactiveAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityAdmin.IJoin,
    },
  );
  typia.assert(inactiveAdminAuth);
  // 3. Retrieve the admin account using the authorized admin's connection
  // Note: Actual inactivity test requires deactivation endpoint which doesn't exist.
  // This validates that the admin lookup API works and returns all required fields.
  const retrievedAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.at(adminConnection, {
      adminId: inactiveAdminAuth.id,
    });
  typia.assert(retrievedAdmin);
  // 4. Validate all required fields are present and correct
  TestValidator.equals(
    "admin id matches",
    retrievedAdmin.id,
    inactiveAdminAuth.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    inactiveAdminAuth.email,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedAdmin.display_name,
    inactiveAdminAuth.display_name,
  );
  TestValidator.equals(
    "admin is_active field is boolean",
    typeof retrievedAdmin.is_active,
    "boolean",
  );
  TestValidator.equals(
    "admin created_at is valid datetime",
    new Date(retrievedAdmin.created_at).toISOString(),
    retrievedAdmin.created_at,
  );
  TestValidator.equals(
    "admin updated_at is valid datetime",
    new Date(retrievedAdmin.updated_at).toISOString(),
    retrievedAdmin.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at is null for non-deleted account",
    retrievedAdmin.deleted_at,
    null,
  );
  // 5. Verify the admin who requested the view has proper authorization
  TestValidator.predicate(
    "requesting admin is active and authorized",
    adminAuth.is_active === true,
  );
  // 6. Verify all critical fields for audit/tracking purposes are present
  TestValidator.notEquals(
    "admin id is not empty",
    retrievedAdmin.id,
    null as any,
  );
  TestValidator.notEquals("admin email is not empty", retrievedAdmin.email, "");
}
