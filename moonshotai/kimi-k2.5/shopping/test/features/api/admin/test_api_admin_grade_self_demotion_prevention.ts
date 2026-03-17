import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that self-demotion prevention is enforced when a super administrator
 * attempts to demote themselves. Prerequisites: Create a single super administrator
 * account. Then attempt to call the target endpoint on their own admin ID with
 * grade='regular'. Verify that the operation returns a 403 Forbidden error with
 * an appropriate error message indicating self-demotion is not allowed. This
 * ensures at least one super administrator remains active on the platform at all
 * times as specified in the business rules.
 */
export async function test_api_admin_grade_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create a super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://example.com/superadmin/join",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Attempt to demote themselves - should fail with 403 Forbidden
  await TestValidator.httpError(
    "self-demotion should return 403 Forbidden",
    403,
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.grade.updateGrade(
        superAdminConnection,
        {
          adminId: superAdmin.id,
          body: {
            grade: "regular",
          } satisfies IEcommerceMallAdmin.IUpdateGrade,
        },
      );
    },
  );
}
