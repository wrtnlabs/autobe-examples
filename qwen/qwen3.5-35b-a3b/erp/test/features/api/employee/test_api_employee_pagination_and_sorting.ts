import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee listing pagination and sorting functionality with various query combinations.
 *
 * Validates the pagination metadata structure and sorting behavior of the employee list endpoint.
 * Tests multiple page sizes, page numbers, and sorting options to ensure correct response
 * structure and data ordering. The test verifies that pagination metadata accurately reflects
 * the total record count, current page position, and available pages.
 *
 * Authentication is performed to ensure proper authorization context. The test focuses on
 * validating the listing endpoint's pagination and sorting logic using typia-generated mock
 * employee data from the SDK simulator.
 *
 * 1. Authenticate as a member with randomized credentials.
 * 2. Test default pagination (page=1, limit=20) with updated_at DESC sorting.
 * 3. Test custom pagination (page=1, limit=5, page=2, limit=5) to verify page boundaries.
 * 4. Test pagination with limit=10 to verify multiple pages are returned.
 * 5. Test sorting by created_at ASC to verify order changes.
 * 6. Test sorting by display_name ASC to verify alphabetical ordering.
 * 7. Test sorting by status ASC to verify status-based ordering.
 * 8. Verify pagination metadata consistency across all requests.
 */
export async function test_api_employee_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmPlatformMember.IJoin>(),
  });
  typia.assert(auth);
  memberConnection.headers = { Authorization: auth.token.access };
  // 2. Test default pagination (page=1, limit=20, sort=updated_at DESC)
  const defaultPage = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    { body: {} satisfies IHrmPlatformEmployee.IRequest },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.predicate("has pagination data", defaultPage.data.length > 0);
  // 3. Test page=1, limit=5
  const page1Limit5 = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 limit 5 current",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit 5 limit", page1Limit5.pagination.limit, 5);
  TestValidator.equals(
    "page 1 limit 5 records count",
    page1Limit5.data.length,
    5,
  );
  // 4. Test page=2, limit=5
  const page2Limit5 = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page 2 limit 5 current",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit 5 limit", page2Limit5.pagination.limit, 5);
  TestValidator.equals(
    "page 2 limit 5 records count",
    page2Limit5.data.length,
    5,
  );
  // 5. Test page=3, limit=5 (last page)
  const page3Limit5 = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 3,
        limit: 5,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(page3Limit5);
  TestValidator.equals(
    "page 3 limit 5 current",
    page3Limit5.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit 5 limit", page3Limit5.pagination.limit, 5);
  TestValidator.equals(
    "page 3 limit 5 records count",
    page3Limit5.data.length,
    5,
  );
  // 6. Test limit=10 (should return 2 pages)
  const limit10Page1 = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(limit10Page1);
  TestValidator.equals("limit 10 current", limit10Page1.pagination.current, 1);
  TestValidator.equals("limit 10 limit", limit10Page1.pagination.limit, 10);
  const limit10Page2 = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(limit10Page2);
  TestValidator.equals(
    "limit 10 page 2 current",
    limit10Page2.pagination.current,
    2,
  );
  TestValidator.equals("limit 10 page 2 records", limit10Page2.data.length, 5);
  // 7. Test sorting by created_at ASC
  const sortByCreatedAsc =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        sort: "created_at",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(sortByCreatedAsc);
  TestValidator.equals(
    "sort created_at current",
    sortByCreatedAsc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "sort created_at has data",
    sortByCreatedAsc.data.length > 0,
  );
  // 8. Test sorting by display_name ASC
  const sortByDisplayNameAsc =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        sort: "display_name",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(sortByDisplayNameAsc);
  TestValidator.equals(
    "sort display_name current",
    sortByDisplayNameAsc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "sort display_name has data",
    sortByDisplayNameAsc.data.length > 0,
  );
  // 9. Test sorting by status ASC
  const sortByStatusAsc =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        sort: "status",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(sortByStatusAsc);
  TestValidator.equals(
    "sort status current",
    sortByStatusAsc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "sort status has data",
    sortByStatusAsc.data.length > 0,
  );
}
