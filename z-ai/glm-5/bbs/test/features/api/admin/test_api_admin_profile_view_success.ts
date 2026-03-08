import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test successful retrieval of an administrator's profile information.
 *
 * This test verifies that an authenticated administrator can successfully
 * retrieve their own profile information through the admin profile endpoint.
 */
export async function test_api_admin_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the administrator's profile using their own ID
  const adminProfile = await api.functional.discussionBoard.admin.admins.at(
    adminConnection,
    { adminId: authorized.id },
  );
  typia.assert(adminProfile);
  // 3. Validate that id matches the requested adminId
  TestValidator.equals("admin id matches", adminProfile.id, authorized.id);
  // 4. Validate that displayName is present
  TestValidator.predicate(
    "displayName is present",
    adminProfile.displayName.length > 0,
  );
  // 5. Validate that grade is either 'regular' or 'super'
  TestValidator.predicate(
    "grade is valid",
    adminProfile.grade === "regular" || adminProfile.grade === "super",
  );
  // 6. Validate that bannedAt and banReason are null for a non-banned admin
  TestValidator.equals(
    "bannedAt is null for active admin",
    adminProfile.bannedAt,
    null,
  );
  TestValidator.equals(
    "banReason is null for active admin",
    adminProfile.banReason,
    null,
  );
  // 7. Validate that deletedAt is null for an active admin
  TestValidator.equals(
    "deletedAt is null for active admin",
    adminProfile.deletedAt,
    null,
  );
}
