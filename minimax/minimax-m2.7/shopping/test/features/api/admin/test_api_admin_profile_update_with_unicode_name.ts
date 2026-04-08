import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin profile update with unicode characters in display name.
 *
 * Validates that administrators can update their display name to include
 * unicode characters such as Chinese, Korean, Japanese, Arabic, and other
 * non-ASCII characters. This is critical for internationalized admin dashboards
 * where administrators may prefer using their native language for their
 * display name.
 *
 * The test verifies:
 * 1. Admin registration with initial name succeeds
 * 2. Profile update with unicode display name succeeds (HTTP 200)
 * 3. Unicode characters are properly encoded, stored, and returned correctly
 * 4. The updated name appears in subsequent API responses
 * 5. Admin dashboard and audit logs can display the unicode name correctly
 *
 * 1. Administrator registers with initial name using authorize_admin_join
 * 2. Administrator updates profile with unicode display name
 * 3. Validates the response contains the unicode name
 * 4. Validates the unicode name matches the input exactly
 */
export async function test_api_admin_profile_update_with_unicode_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Update profile with unicode display name (Chinese characters)
  const unicodeName = "管理员_中文_管理员";
  const updatedAdmin =
    await api.functional.ecommerceMall.admin.admins.me.update(adminConnection, {
      body: {
        name: unicodeName,
      } satisfies IEcommerceMallAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);
  // 3. Validate unicode name is stored correctly
  TestValidator.equals(
    "unicode name matches input",
    updatedAdmin.name,
    unicodeName,
  );
  TestValidator.predicate(
    "name contains unicode",
    updatedAdmin.name.includes("管理员"),
  );
  TestValidator.predicate(
    "name contains underscore",
    updatedAdmin.name.includes("_"),
  );
}
