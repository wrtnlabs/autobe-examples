import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test basic employee directory browsing with default pagination.
 *
 * Validates the primary success path for listing employees within the
 * currently selected organization. After registering and authenticating
 * as a new member, the test requests the employee list without any
 * filters or search criteria — relying entirely on default pagination
 * settings (page 1, default limit, ascending by name).
 *
 * The paginated response is validated for correct metadata computation
 * and each employee entry is confirmed to contain only valid enum values
 * for status and employment type. Type-level validation of all nested
 * relations — member profile, role summary, department assignment,
 * position, and timestamps — is handled comprehensively by typia.assert.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Request the employee list with an empty body for default pagination.
 * 3. Validate pagination: current page is 1, pages equals ceil(records/limit),
 *    data length does not exceed the page limit.
 * 4. Validate each employee has valid status and employment_type enum values.
 */
export async function test_api_employee_list_basic_browsing(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request employee list with default pagination (no filters)
  const page = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata business logic
  const { pagination, data } = page;
  TestValidator.equals("current page defaults to 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate(
    "pages equals ceiling of records divided by limit",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    data.length <= pagination.limit,
  );
  // 4. Validate each employee has valid enum values
  for (const employee of data) {
    TestValidator.predicate(
      "status is active or deactivated",
      employee.status === "active" || employee.status === "deactivated",
    );
    TestValidator.predicate(
      "employment_type is a recognized classification",
      ["full-time", "part-time", "contractor", "intern"].includes(
        employee.employment_type,
      ),
    );
  }
}
