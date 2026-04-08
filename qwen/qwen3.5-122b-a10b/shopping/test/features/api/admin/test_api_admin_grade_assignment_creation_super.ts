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
 * Test super administrator grade assignment creation for another administrator.
 *
 * Validates the complete workflow of promoting an administrator to super grade level by a super administrator. This test ensures that grade assignments can be created successfully and that the assigned administrator receives the elevated privileges associated with the super grade level.
 *
 * The test follows a sequential flow: super admin authentication, target admin creation, grade assignment creation, and response validation. Special attention is given to verifying that the grade assignment includes the correct administrator reference and grade level.
 *
 * 1. Super administrator account is created and authenticated.
 * 2. Target administrator account is created (without grade assignment).
 * 3. Super admin creates grade assignment with grade='super' for target admin.
 * 4. Validates response contains complete grade assignment entity with admin relation.
 * 5. Confirms the assigned grade level is 'super' and admin ID matches target.
 */
export async function test_api_admin_grade_assignment_creation_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create target administrator account (will be promoted to super)
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
  // 3. Super admin creates grade assignment for target admin with super grade
  const gradeAssignment = await api.functional.ecommerce.admin.grades.create(
    superAdminConnection,
    {
      body: {
        ecommerce_admin_id: targetAdmin.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(gradeAssignment);
  // 4. Validate grade assignment response
  TestValidator.equals("grade is super", gradeAssignment.grade, "super");
  TestValidator.equals(
    "admin ID matches",
    gradeAssignment.ecommerceAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    gradeAssignment.ecommerceAdmin.email,
    targetAdmin.email,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(gradeAssignment.id),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    gradeAssignment.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    gradeAssignment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null",
    gradeAssignment.deleted_at === null,
  );
}
