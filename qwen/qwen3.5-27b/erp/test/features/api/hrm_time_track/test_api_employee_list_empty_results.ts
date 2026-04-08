import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list retrieval when no employees exist or filters match no results.
 *
 * Validates that the employee list endpoint correctly handles scenarios where no employees are present or filters return no matches. Ensures proper pagination metadata and response structure are maintained even with empty result sets.
 *
 * Special attention is given to verifying pagination metadata accuracy (records: 0, pages: 0) and that the system gracefully handles various filter combinations without errors.
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Call the employee list endpoint with no filters (empty body).
 * 3. Verify the response contains empty data array and correct pagination metadata.
 * 4. Test with departmentId filter using a non-existent UUID.
 * 5. Verify the response still returns empty data with correct pagination.
 * 6. Test with employmentType and status filters when no employees exist.
 * 7. Verify the system handles empty results gracefully without errors.
 */
export async function test_api_employee_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call employee list endpoint with no filters
  const emptyRequest = {} satisfies IHrmTimeTrackEmployee.IRequest;
  const emptyResponse =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: emptyRequest,
    });
  typia.assert(emptyResponse);
  // 3. Verify empty response structure
  TestValidator.equals("data array is empty", emptyResponse.data.length, 0);
  TestValidator.equals(
    "records count is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", emptyResponse.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1",
    emptyResponse.pagination.current,
    1,
  );
  // 4. Test with non-existent departmentId filter
  const nonExistentDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const departmentFilterRequest = {
    departmentId: nonExistentDepartmentId,
  } satisfies IHrmTimeTrackEmployee.IRequest;
  const departmentFilterResponse =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: departmentFilterRequest,
    });
  typia.assert(departmentFilterResponse);
  // 5. Verify department filter returns empty results
  TestValidator.equals(
    "department filter returns empty data",
    departmentFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "department filter records is 0",
    departmentFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "department filter pages is 0",
    departmentFilterResponse.pagination.pages,
    0,
  );
  // 6. Test with employmentType and status filters
  const combinedFilterRequest = {
    employmentType: "full-time",
    status: "active",
  } satisfies IHrmTimeTrackEmployee.IRequest;
  const combinedFilterResponse =
    await api.functional.hrmTimeTrack.member.employees.index(memberConnection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilterResponse);
  // 7. Verify combined filters return empty results
  TestValidator.equals(
    "combined filters return empty data",
    combinedFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters records is 0",
    combinedFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters pages is 0",
    combinedFilterResponse.pagination.pages,
    0,
  );
}
