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
 * Test administrator grade listing with default pagination parameters.
 *
 * Validates that an authenticated administrator can retrieve a paginated list of administrator grade assignments without specifying any filter criteria. The test ensures the endpoint returns proper pagination metadata and grade assignment summaries with all required fields.
 *
 * The scenario follows the natural authentication and data retrieval flow:
 * 1. Administrator registers and authenticates via join endpoint
 * 2. Administrator calls grade listing endpoint with empty request body
 * 3. Response is validated for pagination structure and grade assignment data
 *
 * 1. Administrator joins the system with randomized credentials.
 * 2. Administrator calls the grade listing endpoint with default pagination.
 * 3. Validates pagination object contains current page, limit, records, and pages.
 * 4. Validates data array contains grade assignment summaries with required fields.
 * 5. Validates pagination metadata values are non-negative.
 */
export async function test_api_admin_grade_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
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
  typia.assert(adminAuth);
  // 2. Call grade listing endpoint with default pagination (empty body)
  const gradeListing: IPageIEcommerceAdministratorGrade.ISummary =
    await api.functional.ecommerce.admin.grades.index(adminConnection, {
      body: {} satisfies IEcommerceAdministratorGrade.IRequest,
    });
  typia.assert(gradeListing);
  // 3. Validate pagination structure - business logic validations only
  TestValidator.predicate(
    "pagination current page is non-negative",
    gradeListing.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    gradeListing.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    gradeListing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    gradeListing.pagination.pages >= 0,
  );
  // 4. Validate data array exists and has correct structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(gradeListing.data),
  );
  // 5. If data exists, validate grade assignment summaries
  if (gradeListing.data.length > 0) {
    for (const grade of gradeListing.data) {
      typia.assert(grade);
    }
  }
}
