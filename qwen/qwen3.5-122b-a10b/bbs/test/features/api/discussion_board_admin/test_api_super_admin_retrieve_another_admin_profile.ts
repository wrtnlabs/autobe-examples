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
 * Test that a super administrator can retrieve another administrator's profile information.
 *
 * This test validates the cross-administrator profile viewing workflow used during admin management.
 * It ensures that super administrators have the ability to view any administrator's profile
 * regardless of their grade level, which is essential for administrative oversight and management.
 */
export async function test_api_super_admin_retrieve_another_admin_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Register a regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Super admin retrieves regular admin's profile using super admin's connection
  const retrievedAdmin = await api.functional.discussionBoard.admin.admins.at(
    superAdminConnection,
    {
      adminId: regularAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate retrieved profile matches regular admin data
  TestValidator.equals("admin ID matches", retrievedAdmin.id, regularAdmin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedAdmin.display_name,
    regularAdmin.display_name,
  );
  TestValidator.equals(
    "admin grade is regular",
    retrievedAdmin.grade,
    "regular",
  );
  TestValidator.equals("bio matches", retrievedAdmin.bio, regularAdmin.bio);
  TestValidator.equals(
    "created_at matches",
    retrievedAdmin.created_at,
    regularAdmin.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAdmin.updated_at,
    regularAdmin.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedAdmin.deleted_at,
    regularAdmin.deleted_at,
  );
}
