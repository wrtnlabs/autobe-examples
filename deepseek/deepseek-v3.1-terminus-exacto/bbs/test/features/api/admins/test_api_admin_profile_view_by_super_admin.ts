import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator can view detailed profile of any administrator account.
 *
 * This test validates that super administrators have universal access to administrator
 * profiles, including cross-account viewing permissions. It verifies that the API
 * returns all non-sensitive administrator fields while properly excluding password_hash.
 */
export async function test_api_admin_profile_view_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Authenticate as super administrator (re-login for clean session)
  const superAdminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminAuthConnection, {
    body: {
      email: superAdmin.email,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 4. Retrieve regular administrator profile via super admin
  const profile = await api.functional.discussionBoard.admins.at(
    superAdminAuthConnection,
    {
      adminId: regularAdmin.id,
    },
  );
  typia.assert(profile);
  // 5. Validate response data matches expected administrator fields
  TestValidator.equals("admin id matches", profile.id, regularAdmin.id);
  TestValidator.equals(
    "admin email matches",
    profile.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "admin grade is regular",
    profile.admin_grade,
    "regular",
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    return new Date(profile.created_at).toString() !== "Invalid Date";
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    return new Date(profile.updated_at).toString() !== "Invalid Date";
  });
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
