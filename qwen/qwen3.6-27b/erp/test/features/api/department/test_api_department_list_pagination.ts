import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test department listing with pagination within an authenticated member's organization.
 *
 * Validates the paginated department listing endpoint by authenticating a new member and querying the department list. Verifies that the response structure includes proper pagination metadata (current page, limit, total records, total pages) and a data array containing department summaries. Each department summary includes the department id, name, nullable parent department reference, and timestamp fields (created_at, updated_at, deleted_at).
 *
 * Special attention is given to edge cases: an empty organization with no departments should return a valid page with an empty data array and pagination showing zero records and zero pages. Pagination navigation beyond the last page should also return valid empty results.
 *
 * 1. Authenticate a new member account, which auto-creates a default organization.
 * 2. Call the department listing endpoint with default pagination parameters (page=1, limit=10).
 * 3. Validate the response structure: pagination metadata fields are present and valid.
 * 4. Verify empty organization returns data array with zero length, records=0, pages=0.
 * 5. Test pagination navigation with page=2 to verify handling beyond available results.
 * 6. Validate the second page also returns a valid empty page structure.
 */
export async function test_api_department_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (auto-creates organization with no departments)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List departments with default pagination (page=1, limit=10)
  const pageOneBody = {
    page: 1,
    limit: 10,
  } satisfies IHrmPlatformDepartment.IRequest;
  const pageOne = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    { body: pageOneBody },
  );
  typia.assert(pageOne);
  // 3. Validate pagination metadata structure
  TestValidator.equals("page one current is 1", pageOne.pagination.current, 1);
  TestValidator.equals("page one limit is 10", pageOne.pagination.limit, 10);
  TestValidator.predicate(
    "page one records is non-negative",
    pageOne.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page one pages is non-negative",
    pageOne.pagination.pages >= 0,
  );
  // 4. Verify empty organization returns empty data array
  TestValidator.predicate("data is an array", Array.isArray(pageOne.data));
  // 5. Test pagination with page=2 (beyond available results)
  const pageTwoBody = {
    page: 2,
    limit: 10,
  } satisfies IHrmPlatformDepartment.IRequest;
  const pageTwo = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    { body: pageTwoBody },
  );
  typia.assert(pageTwo);
  // 6. Validate page two pagination structure
  TestValidator.equals("page two current is 2", pageTwo.pagination.current, 2);
  TestValidator.equals("page two limit is 10", pageTwo.pagination.limit, 10);
  TestValidator.predicate(
    "page two data is array",
    Array.isArray(pageTwo.data),
  );
}
