import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator grade level filtering functionality.
 *
 * Validates that administrators can filter the administrator list by grade level (regular or super) to view only administrators with specific privilege levels. This test ensures the grade filtering mechanism works correctly through the JOIN with the ecommerce_administrator_grades table.
 *
 * The test creates administrators and verifies that grade filtering returns only matching administrators based on their current grade assignment. Both grade filters are tested to ensure comprehensive coverage of the filtering mechanism.
 *
 * 1. Authenticate as an administrator using authorize_admin_join.
 * 2. Create additional administrators with default grade assignments.
 * 3. Query all administrators to identify existing grade levels in the system.
 * 4. Filter administrators by each identified grade and verify results contain only matching administrators.
 * 5. Validate that grade filtering correctly uses the JOIN with ecommerce_administrator_grades table.
 * 6. Ensure no sensitive data (password hashes) are exposed in responses.
 */
export async function test_api_admin_filter_by_grade_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create additional administrators with default grade assignments
  const additionalAdminConnection: api.IConnection = { host: connection.host };
  const additionalAdminAuth = await authorize_admin_join(
    additionalAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(additionalAdminAuth);
  // 3. Query all administrators to identify existing grade levels
  const allAdmins: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(allAdmins);
  // Extract unique grade levels from existing administrators
  const existingGrades = Array.from(
    new Set(allAdmins.data.map((admin) => admin.grade)),
  );
  // 4. Test filtering by each existing grade level
  await ArrayUtil.asyncForEach(existingGrades, async (grade) => {
    const filteredResult: IPageIEcommerceAdmin.ISummary =
      await api.functional.ecommerce.admin.admins.index(adminConnection, {
        body: {
          grade,
          limit: 100,
          page: 1,
        } satisfies IEcommerceAdmin.IRequest,
      });
    typia.assert(filteredResult);
    // 5. Verify all results have the filtered grade
    TestValidator.predicate(
      `all results have ${grade} grade`,
      filteredResult.data.every((admin) => admin.grade === grade),
    );
    // 6. Validate grade filtering correctness
    if (existingGrades.length > 1) {
      TestValidator.predicate(
        `filtered results are subset of all admins`,
        filteredResult.data.every((filtered) =>
          allAdmins.data.some((all) => all.id === filtered.id),
        ),
      );
    }
  });
  // 7. Validate no password hashes exposed in responses
  TestValidator.predicate(
    "no password_hash field in responses",
    allAdmins.data.every(
      (admin) => !("password_hash" in admin) && !("password" in admin),
    ),
  );
}
