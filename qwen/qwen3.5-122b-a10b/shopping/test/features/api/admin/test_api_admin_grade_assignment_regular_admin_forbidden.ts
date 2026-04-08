import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_grades_create } from "../../../generate/generate_random_ecommerce_admin_grades_create";
import { prepare_random_ecommerce_administrator_grade } from "../../../prepare/prepare_random_ecommerce_administrator_grade";

/**
 * Test that a regular administrator cannot create grade assignments and receives a 403 Forbidden response.
 *
 * Validates the authorization boundary for administrator grade management by confirming that regular administrators are prohibited from modifying grade assignments. Only super administrators have permission to create, promote, or demote administrator grade levels.
 *
 * The test follows this workflow:
 * 1. Register and authenticate a regular administrator account
 * 2. Create a target administrator account for grade assignment attempt
 * 3. Attempt to create a grade assignment using regular admin credentials
 * 4. Verify the system returns 403 Forbidden error with appropriate error message
 * 5. Confirm no grade assignment was created in the system
 *
 * This validates the critical security boundary preventing privilege escalation through unauthorized grade manipulation.
 */
export async function test_api_admin_grade_assignment_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 2. Create a target administrator account for grade assignment attempt
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // 3. Attempt to create a grade assignment using regular admin credentials
  // This should fail with 403 Forbidden since regular admins cannot modify grades
  await TestValidator.httpError(
    "regular admin cannot create grade assignment",
    403,
    async () => {
      await api.functional.ecommerce.admin.grades.create(
        regularAdminConnection,
        {
          body: {
            ecommerce_admin_id: targetAdmin.id,
            grade: "regular",
          } satisfies IEcommerceAdministratorGrade.ICreate,
        },
      );
    },
  );
}
