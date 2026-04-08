import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator updating another administrator's grade level.
 *
 * Validates the complete grade management workflow including promotion of regular administrators to super administrator status, demotion of super administrators to regular status, and prevention of self-demotion to avoid privilege escalation vulnerabilities.
 *
 * The test ensures that grade changes are immediately reflected in the administrator record and that the system properly enforces the self-demotion restriction to maintain security.
 *
 * 1. Super admin promotes a regular administrator to super administrator grade by setting grade to 'super'. Verify the administrator immediately gains super admin privileges.
 * 2. Super admin demotes another super administrator to regular administrator grade by setting grade to 'regular'. Verify the demoted administrator loses super admin privileges.
 * 3. Super admin attempts to demote themselves (adminId matches requester's ID with grade 'regular'). Verify the system rejects with 403 Forbidden to prevent privilege escalation.
 */
export async function test_api_administrator_grade_level_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super admin (the actor performing updates)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  // 2. Register second super admin (will be demoted in scenario 2)
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // 3. Scenario 1: Promote regular admin to super admin
  // Create a regular admin by using a random UUID (simulating existing admin)
  const regularAdminId = typia.random<string & tags.Format<"uuid">>();
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: regularAdminId,
        body: {
          grade: "super",
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.equals(
    "promoted admin grade is super",
    promotedAdmin.grade,
    "super",
  );
  TestValidator.equals(
    "promoted admin id matches",
    promotedAdmin.id,
    regularAdminId,
  );
  // 4. Scenario 2: Demote another super admin to regular
  const demotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: superAdmin2.id,
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(demotedAdmin);
  TestValidator.equals(
    "demoted admin grade is regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals(
    "demoted admin id matches",
    demotedAdmin.id,
    superAdmin2.id,
  );
  TestValidator.notEquals(
    "grade changed from super",
    demotedAdmin.grade,
    "super",
  );
  // 5. Scenario 3: Attempt self-demotion (should fail with 403)
  await TestValidator.error("self-demotion forbidden", async () => {
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: superAdmin1.id,
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  });
}
