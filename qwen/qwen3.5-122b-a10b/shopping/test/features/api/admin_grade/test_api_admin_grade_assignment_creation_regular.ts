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
 * Test super administrator can create regular grade assignment for another administrator.
 *
 * Validates the complete grade assignment workflow including super administrator authentication, target administrator account creation, and successful grade assignment with regular privileges. Ensures that the grade assignment is created correctly with all required fields and is immediately effective.
 *
 * The test follows the natural flow: super admin joins → target admin joins → grade assignment created → response validated. Special attention is given to verifying that the grade assignment contains the correct grade level, references the target administrator, and includes all timestamp fields.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Target administrator account is created.
 * 3. Grade assignment is created with grade='regular' for target admin.
 * 4. Validates response contains complete grade assignment entity with id, ecommerceAdmin summary, grade, created_at, and updated_at.
 * 5. Confirms grade assignment is effective by checking grade value equals 'regular'.
 */
export async function test_api_admin_grade_assignment_creation_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceAdmin.IAuthorized =
    await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // 2. Target administrator registration (will need approval before grade assignment)
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin: IEcommerceAdmin.IAuthorized =
    await authorize_admin_join(targetAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(targetAdmin);
  // 3. Create grade assignment with regular grade level
  const gradeAssignment: IEcommerceAdministratorGrade =
    await generate_random_ecommerce_admin_grades_create(superAdminConnection, {
      body: {
        ecommerce_admin_id: targetAdmin.id,
        grade: "regular",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    });
  typia.assert(gradeAssignment);
  // 4. Validate response structure and content
  TestValidator.predicate(
    "grade assignment id exists",
    gradeAssignment.id.length > 0,
  );
  TestValidator.equals(
    "grade equals regular",
    gradeAssignment.grade,
    "regular",
  );
  TestValidator.equals(
    "admin id matches",
    gradeAssignment.ecommerceAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    gradeAssignment.ecommerceAdmin.email,
    targetAdmin.email,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    gradeAssignment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    gradeAssignment.updated_at.length > 0,
  );
}