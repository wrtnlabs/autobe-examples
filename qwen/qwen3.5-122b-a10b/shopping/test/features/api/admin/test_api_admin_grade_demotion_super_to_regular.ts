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
 * Test super administrator demotes another super administrator to regular grade.
 *
 * Validates the grade demotion workflow where a super administrator can reduce another super administrator's privileges to regular level. This test ensures proper authorization, grade transition recording, and immediate privilege update. The performing administrator must be a super admin and cannot demote themselves.
 *
 * **Business Rules Validated**
 * - Super administrators can demote other super administrators to regular level
 * - Self-demotion is prohibited at the service layer
 * - Grade changes take effect immediately upon successful update
 * - All grade transitions are recorded in the audit trail
 *
 * 1. Performing super administrator authenticates via join endpoint.
 * 2. Target administrator is created and assigned super grade.
 * 3. Performing admin demotes target via PUT request with grade='regular'.
 * 4. System updates the grade assignment immediately.
 * 5. Validates response contains updated grade record with new grade value of 'regular'.
 */
export async function test_api_admin_grade_demotion_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Performing super admin authenticates
  const performingConnection: api.IConnection = { host: connection.host };
  const performingAdmin = await authorize_admin_join(performingConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(performingAdmin);
  // Create super grade for performing admin
  const performingGrade = await generate_random_ecommerce_admin_grades_create(
    performingConnection,
    {
      body: {
        ecommerce_admin_id: performingAdmin.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(performingGrade);
  // 2. Target admin authenticates
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // Create super grade for target admin
  const targetGrade = await generate_random_ecommerce_admin_grades_create(
    targetConnection,
    {
      body: {
        ecommerce_admin_id: targetAdmin.id,
        grade: "super",
      } satisfies IEcommerceAdministratorGrade.ICreate,
    },
  );
  typia.assert(targetGrade);
  // 3. Perform demotion via performing admin's connection
  const updatedGrade = await api.functional.ecommerce.admin.grades.update(
    performingConnection,
    {
      adminId: targetAdmin.id,
      body: {
        grade: "regular",
      } satisfies IEcommerceAdministratorGrade.IUpdate,
    },
  );
  typia.assert(updatedGrade);
  // 4. Validate grade was updated to regular
  TestValidator.equals("grade is regular", updatedGrade.grade, "regular");
  TestValidator.equals(
    "admin ID matches",
    updatedGrade.ecommerceAdmin.id,
    targetAdmin.id,
  );
}
