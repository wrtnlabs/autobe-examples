import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator grade listing filtering by grade level.
 *
 * Validates that administrators can filter grade assignments by specifying a grade level (regular or super) in the request body, and the response contains only matching records. This test ensures the filtering business logic works correctly and pagination metadata reflects the filtered result count.
 *
 * The test creates an administrator, then verifies that filtering by grade returns only matching assignments. All returned records must have the grade field matching the filter value, and pagination metadata must accurately reflect the filtered count.
 *
 * 1. Authenticate as administrator using join endpoint.
 * 2. Filter grade listings by 'regular' grade level.
 * 3. Validate all returned records have grade === 'regular'.
 * 4. Filter grade listings by 'super' grade level.
 * 5. Validate all returned records have grade === 'super'.
 * 6. Verify pagination metadata matches filtered data count.
 */
export async function test_api_admin_grade_listing_filter_by_grade_level(
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
  // 2. Filter by 'regular' grade level
  const regularFilterResponse =
    await api.functional.ecommerce.admin.grades.index(adminConnection, {
      body: {
        grade: "regular",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdministratorGrade.IRequest,
    });
  typia.assert(regularFilterResponse);
  // 3. Validate all returned records have grade === 'regular'
  for (const record of regularFilterResponse.data) {
    TestValidator.equals("grade matches filter", record.grade, "regular");
  }
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination records match data length",
    regularFilterResponse.pagination.records,
    regularFilterResponse.data.length,
  );
  // 5. Filter by 'super' grade level
  const superFilterResponse = await api.functional.ecommerce.admin.grades.index(
    adminConnection,
    {
      body: {
        grade: "super",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdministratorGrade.IRequest,
    },
  );
  typia.assert(superFilterResponse);
  // 6. Validate all returned records have grade === 'super'
  for (const record of superFilterResponse.data) {
    TestValidator.equals("grade matches filter", record.grade, "super");
  }
  // 7. Validate pagination metadata for super filter
  TestValidator.equals(
    "pagination records match data length",
    superFilterResponse.pagination.records,
    superFilterResponse.data.length,
  );
}
