import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce administrator grade assignment data for E2E testing.
 *
 * Generates a complete IEcommerceAdministratorGrade.ICreate with randomized values for testing administrator permission level assignments.
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
 * const gradeAssignment = prepare_random_ecommerce_administrator_grade();
 *
 * // Generate with specific grade
 * const superAdmin = prepare_random_ecommerce_administrator_grade({ grade: "super" });
 *
 * // Generate with specific admin ID
 * const assignment = prepare_random_ecommerce_administrator_grade({
 *   ecommerce_admin_id: "existing-admin-uuid"
 * });
 * ```
 */
export function prepare_random_ecommerce_administrator_grade(
  input?: DeepPartial<IEcommerceAdministratorGrade.ICreate>,
): IEcommerceAdministratorGrade.ICreate {
  return {
    ecommerce_admin_id:
      input?.ecommerce_admin_id ?? typia.random<string & tags.Format<"uuid">>(),
    grade: input?.grade ?? RandomGenerator.pick(["regular", "super"] as const),
  };
}
