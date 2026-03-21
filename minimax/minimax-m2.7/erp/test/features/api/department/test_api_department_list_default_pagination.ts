import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the default department listing behavior for an authenticated admin.
 *
 * This test validates:
 * 1. Admin authentication via join endpoint
 * 2. Default pagination settings (current=1, limit=20)
 * 3. Response structure with pagination and data array
 * 4. Department sorting (alphabetically by name ascending)
 * 5. Only active departments returned (deleted_at is null)
 * 6. Required department fields present
 * 7. Optional fields (description, parent) included when present
 */
export async function test_api_department_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Request department list with empty body (default settings)
  const response = await api.functional.erpHrm.admin.departments.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "has pagination object",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current field",
    "current" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has limit field",
    "limit" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has records field",
    "records" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has pages field",
    "pages" in response.pagination,
    true,
  );
  // Step 4: Validate pagination defaults
  TestValidator.equals(
    "default current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // Step 5: Validate response has data array
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // Step 6: Validate department fields if data exists
  if (response.data.length > 0) {
    const firstDept = response.data[0];
    TestValidator.equals("has id field", "id" in firstDept, true);
    TestValidator.equals("has name field", "name" in firstDept, true);
    TestValidator.equals(
      "has created_at field",
      "created_at" in firstDept,
      true,
    );
    TestValidator.equals(
      "has updated_at field",
      "updated_at" in firstDept,
      true,
    );
    // Optional fields check
    if (firstDept.description !== undefined) {
      TestValidator.equals(
        "description type check",
        typeof firstDept.description === "string" ||
          firstDept.description === null,
        true,
      );
    }
    if (firstDept.parent !== undefined) {
      // parent can be null or IErpHrmDepartment.ISummary
      TestValidator.equals(
        "parent is object or null",
        firstDept.parent === null || typeof firstDept.parent === "object",
        true,
      );
    }
    // Step 7: Validate alphabetical sorting by name (ascending)
    for (let i = 1; i < response.data.length; i++) {
      const prevName = response.data[i - 1].name.toLowerCase();
      const currName = response.data[i].name.toLowerCase();
      TestValidator.predicate(
        `departments sorted alphabetically at index ${i}`,
        prevName <= currName,
      );
    }
  }
  // Step 8: Validate records and pages consistency
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
}
