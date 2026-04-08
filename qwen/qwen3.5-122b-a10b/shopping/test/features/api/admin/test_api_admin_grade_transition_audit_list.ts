import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminGradeTransition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator grade transition audit log retrieval with pagination.
 *
 * Validates that administrators can successfully retrieve paginated grade transition audit logs showing the complete immutable audit trail of all administrator grade changes, including promotions and demotions. This test verifies the primary success path for viewing grade transition records with proper pagination metadata and record structure validation.
 *
 * The test ensures that grade transition records contain all required fields including target administrator details, performing administrator details, grade values before and after the change, and timestamps. Pagination metadata is validated to ensure correct page numbering, record counts, and total pages calculation.
 *
 * 1. Create and authenticate as an administrator via registration endpoint.
 * 2. Call grade transition audit list endpoint with empty filters.
 * 3. Validate response structure includes pagination and data array.
 * 4. Verify pagination metadata has correct current page, limit, records, and pages.
 * 5. Verify each grade transition record has required fields: id, from_grade, to_grade, changed_at, admin, performedByAdmin.
 * 6. Verify admin and performedByAdmin objects contain id, email, grade, created_at, updated_at, deleted_at.
 * 7. Validate that grade values are either 'regular' or 'super'.
 * 8. Handle empty result set scenario when no transitions exist.
 */
export async function test_api_admin_grade_transition_audit_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call grade transition audit list endpoint with empty filters
  const result: IPageIEcommerceAdminGradeTransition.ISummary =
    await api.functional.ecommerce.admin.grade_transitions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceAdminGradeTransition.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  if (result.data.length > 0) {
    // When data exists, validate each record structure
    for (const transition of result.data) {
      // Validate grade transition record fields
      TestValidator.predicate(
        "transition has valid id",
        transition.id.length > 0,
      );
      TestValidator.predicate(
        "from_grade is valid",
        transition.from_grade === "regular" ||
          transition.from_grade === "super",
      );
      TestValidator.predicate(
        "to_grade is valid",
        transition.to_grade === "regular" || transition.to_grade === "super",
      );
      TestValidator.predicate(
        "changed_at is valid datetime",
        transition.changed_at.length > 0,
      );
      // Validate admin (target) object
      TestValidator.predicate(
        "admin has valid id",
        transition.admin.id.length > 0,
      );
      TestValidator.predicate(
        "admin has valid email",
        transition.admin.email.length > 0,
      );
      TestValidator.predicate(
        "admin grade is valid",
        transition.admin.grade === "regular" ||
          transition.admin.grade === "super",
      );
      // Validate performedByAdmin object
      TestValidator.predicate(
        "performedByAdmin has valid id",
        transition.performedByAdmin.id.length > 0,
      );
      TestValidator.predicate(
        "performedByAdmin has valid email",
        transition.performedByAdmin.email.length > 0,
      );
      TestValidator.predicate(
        "performedByAdmin grade is valid",
        transition.performedByAdmin.grade === "regular" ||
          transition.performedByAdmin.grade === "super",
      );
    }
    // 5. Verify records are ordered by changed_at DESC (newest first)
    for (let i = 1; i < result.data.length; i++) {
      const previous = new Date(result.data[i - 1].changed_at).getTime();
      const current = new Date(result.data[i].changed_at).getTime();
      TestValidator.predicate(
        `record ${i} is older than or equal to record ${i - 1}`,
        current <= previous,
      );
    }
  } else {
    // 6. Handle empty result set scenario
    TestValidator.equals(
      "empty data array has 0 records",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data array has 0 pages",
      result.pagination.pages,
      0,
    );
  }
}
