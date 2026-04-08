import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_administrator_grade } from "../prepare/prepare_random_ecommerce_administrator_grade";

/**
 * Generate a random administrator grade assignment via the API for E2E testing.
 *
 * Prepares random grade assignment data using the prepare function, then calls the creation endpoint to assign a grade level to an administrator account.
 *
 * ## Grade Levels
 *
 * - **regular** — Standard administrator with permissions to approve sellers, manage categories, oversee products and orders, and manage user accounts
 * - **super** — Super administrator with elevated privileges including the ability to promote and demote other administrators
 *
 * ## Usage
 *
 * ```typescript
 * // Generate with random grade
 * const gradeAssignment = await generate_random_ecommerce_admin_grades_create(connection);
 *
 * // Generate with specific grade
 * const superAdmin = await generate_random_ecommerce_admin_grades_create(connection, {
 *   body: { grade: "super" }
 * });
 *
 * // Generate for specific administrator
 * const assignment = await generate_random_ecommerce_admin_grades_create(connection, {
 *   body: { ecommerce_admin_id: "existing-admin-uuid" }
 * });
 * ```
 *
 * ## Authorization
 *
 * Only super administrators can create grade assignments. Regular administrators cannot modify administrator grades. This authorization is handled separately in test scenarios.
 */
export async function generate_random_ecommerce_admin_grades_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdministratorGrade.ICreate>;
  },
): Promise<IEcommerceAdministratorGrade> {
  const prepared: IEcommerceAdministratorGrade.ICreate =
    prepare_random_ecommerce_administrator_grade(props.body);
  const result: IEcommerceAdministratorGrade =
    await api.functional.ecommerce.admin.grades.create(connection, {
      body: prepared,
    });
  return result;
}
