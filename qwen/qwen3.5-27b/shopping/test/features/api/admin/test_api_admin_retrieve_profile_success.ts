import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path for retrieving an administrator's detailed profile information.
 *
 * This test verifies that:
 * 1. A new administrator can be registered and authenticated
 * 2. The administrator can retrieve their own profile information
 * 3. The profile response contains all required fields with correct values
 * 4. Default values are properly set (grade='regular', status='active', deleted_at=null)
 */
export async function test_api_admin_retrieve_profile_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and register new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // Capture admin ID and email for validation
  const adminId: string & tags.Format<"uuid"> = authorized.id;
  const adminEmail: string & tags.Format<"email"> = authorized.email;
  // 2. Execution: Retrieve administrator profile
  const profile = await api.functional.shoppingMall.admin.admins.at(
    adminConnection,
    {
      adminId,
    },
  );
  typia.assert(profile);
  // 3. Validation: Verify all required fields and default values
  TestValidator.equals("admin ID matches", profile.id, adminId);
  TestValidator.equals("email matches registration", profile.email, adminEmail);
  TestValidator.equals("grade is regular by default", profile.grade, "regular");
  TestValidator.equals("status is active by default", profile.status, "active");
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      profile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      profile.updated_at,
    ),
  );
}
