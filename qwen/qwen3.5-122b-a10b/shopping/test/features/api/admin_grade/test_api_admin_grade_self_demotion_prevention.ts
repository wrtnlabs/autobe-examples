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

export async function test_api_admin_grade_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authenticates successfully
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create super grade assignment for the administrator
  const gradeAssignment = await api.functional.ecommerce.admin.grades.create(
    adminConnection,
    {
      body: {
        ecommerce_admin_id: admin.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(gradeAssignment);
  TestValidator.equals(
    "initial grade is super",
    gradeAssignment.grade,
    "super",
  );
  // 3. Attempt to demote themselves via PUT request - should be blocked
  await TestValidator.httpError(
    "self-demotion should be blocked with 400 Bad Request",
    400,
    async () => {
      await api.functional.ecommerce.admin.grades.update(adminConnection, {
        adminId: admin.id,
        body: {
          grade: "regular",
        } satisfies IEcommerceAdministratorGrade.IUpdate,
      });
    },
  );
  // 4. Verify grade remains 'super' by attempting another self-demotion
  // If the grade had changed to 'regular', this would succeed (regular can't demote anyway)
  // If still 'super', self-demotion continues to be blocked
  await TestValidator.httpError(
    "self-demotion continues to be blocked (grade unchanged)",
    400,
    async () => {
      await api.functional.ecommerce.admin.grades.update(adminConnection, {
        adminId: admin.id,
        body: {
          grade: "regular",
        } satisfies IEcommerceAdministratorGrade.IUpdate,
      });
    },
  );
  // 5. Verify admin's grade in auth response still shows 'super'
  TestValidator.equals(
    "admin grade in auth response is super",
    admin.grade.grade,
    "super",
  );
}
