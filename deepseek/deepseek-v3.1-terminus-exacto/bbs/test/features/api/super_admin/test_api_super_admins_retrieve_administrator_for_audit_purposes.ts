import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_super_admins_retrieve_administrator_for_audit_purposes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for authentication context using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account for relationship testing using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Retrieve super administrator details for audit validation
  const retrieved = await api.functional.discussionBoard.super_admins.at(
    superAdminConnection,
    {
      superAdminId: superAdmin.id as string & tags.Format<"uuid">,
    },
  );
  typia.assert(retrieved);
  // 4. Validate complete administrator information for audit purposes
  TestValidator.equals(
    "super administrator id matches",
    retrieved.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "permission_level present",
    retrieved.permission_level,
    superAdmin.permission_level,
  );
  TestValidator.equals(
    "assignment_date present",
    retrieved.assignment_date,
    superAdmin.assignment_date,
  );
  // Remove email validation as it doesn't exist on IDiscussionBoardSuperAdmin
  // Remove privilege_level validation as it doesn't exist on IDiscussionBoardSuperAdmin
  TestValidator.predicate("created_at present for audit trail", () => {
    const date = new Date(retrieved.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at present for audit trail", () => {
    const date = new Date(retrieved.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "deleted_at is null for active account",
    retrieved.deleted_at === null,
  );
  // 5. Validate section assignment information (typia.assert already validated everything)
  typia.assert(retrieved.section);
  // 6. Validate admin and superAdmin fields (both should be null for self-lookup)
  TestValidator.equals(
    "admin field is null for self-lookup",
    retrieved.admin,
    null,
  );
  TestValidator.equals(
    "superAdmin field is null for self-lookup",
    retrieved.superAdmin,
    null,
  );
  // 7. Test unauthorized access attempt by regular administrator
  await TestValidator.error(
    "regular admin cannot retrieve super admin",
    async () => {
      await api.functional.discussionBoard.super_admins.at(adminConnection, {
        superAdminId: superAdmin.id as string & tags.Format<"uuid">,
      });
    },
  );
}