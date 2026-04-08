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
 * Test super administrator can promote regular administrator to super grade.
 *
 * Validates the complete grade promotion workflow from regular to super administrator level. Ensures that super administrators have the authority to promote other administrators and that the grade transition is properly recorded in the system.
 *
 * The test verifies the promotion operation takes effect immediately, the response contains the updated grade information, and the grade assignment record is correctly modified with the new grade level.
 *
 * 1. Super administrator authenticates with valid credentials.
 * 2. Target administrator account is created and registered.
 * 3. Regular grade assignment is created for target administrator.
 * 4. Super grade assignment is created for performing administrator.
 * 5. Super admin promotes target admin from regular to super grade.
 * 6. Validates response contains updated grade with 'super' value.
 * 7. Validates updated_at timestamp reflects the promotion time.
 */
export async function test_api_admin_grade_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Create target administrator connection and authenticate
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdminAuth = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(targetAdminAuth);
  // 3. Create super grade assignment for performing administrator
  const superGrade = await api.functional.ecommerce.admin.grades.create(
    superAdminConnection,
    {
      body: {
        ecommerce_admin_id: superAdminAuth.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(superGrade);
  TestValidator.equals("super admin grade is super", superGrade.grade, "super");
  // 4. Create regular grade assignment for target administrator
  const regularGrade = await api.functional.ecommerce.admin.grades.create(
    superAdminConnection,
    {
      body: {
        ecommerce_admin_id: targetAdminAuth.id,
        grade: "regular",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(regularGrade);
  TestValidator.equals(
    "target admin initial grade is regular",
    regularGrade.grade,
    "regular",
  );
  // 5. Super admin promotes target admin from regular to super
  const updatedGrade = await api.functional.ecommerce.admin.grades.update(
    superAdminConnection,
    {
      adminId: targetAdminAuth.id,
      body: {
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.IUpdate,
    },
  );
  typia.assert(updatedGrade);
  // 6. Validate promotion results
  TestValidator.equals("grade updated to super", updatedGrade.grade, "super");
  TestValidator.notEquals(
    "updated_at changed from creation time",
    updatedGrade.updated_at,
    regularGrade.created_at,
  );
  TestValidator.equals(
    "admin ID matches target",
    updatedGrade.ecommerceAdmin.id,
    targetAdminAuth.id,
  );
  TestValidator.equals(
    "admin email matches target",
    updatedGrade.ecommerceAdmin.email,
    targetAdminAuth.email,
  );
}
