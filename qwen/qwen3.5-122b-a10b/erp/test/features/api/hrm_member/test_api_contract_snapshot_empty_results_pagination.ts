import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test contract snapshot empty results pagination.
 *
 * Validates that the contract snapshot search endpoint returns proper pagination metadata when no records match the search criteria. This edge case testing ensures the API handles empty result sets gracefully with consistent response structure.
 *
 * The test verifies that filtering with non-existent criteria (such as invalid employee IDs or contract IDs) returns a valid empty page with pagination metadata showing zero records and zero pages, maintaining the same response structure as non-empty results.
 *
 * 1. Authenticate as member using authorize_member_join.
 * 2. Create search request with non-existent employee_id (random UUID).
 * 3. Call snapshots.index API and validate empty response.
 * 4. Verify pagination metadata has records=0, pages=0, empty data array.
 * 5. Test with multiple filter combinations for consistency.
 */
export async function test_api_contract_snapshot_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Test with non-existent employee_id
  const nonExistentEmployeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyResult1 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        employee_id: nonExistentEmployeeId,
        page: 1,
        limit: 10,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(emptyResult1);
  // 3. Validate pagination metadata for employee_id filter
  TestValidator.equals(
    "records count should be 0",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    emptyResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResult1.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", emptyResult1.pagination.limit, 10);
  TestValidator.equals(
    "data array should be empty",
    emptyResult1.data.length,
    0,
  );
  // 4. Test with non-existent contract_id
  const nonExistentContractId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyResult2 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        hrm_contract_id: nonExistentContractId,
        page: 1,
        limit: 20,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(emptyResult2);
  // 5. Validate pagination metadata for contract_id filter
  TestValidator.equals(
    "records count should be 0",
    emptyResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    emptyResult2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResult2.data.length,
    0,
  );
  // 6. Test with date range that has no contracts
  const farFutureDate: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 100,
  ).toISOString();
  const emptyResult3 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        start_date_from: farFutureDate,
        page: 1,
        limit: 50,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(emptyResult3);
  // 7. Validate pagination metadata for date range filter
  TestValidator.equals(
    "records count should be 0",
    emptyResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    emptyResult3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResult3.data.length,
    0,
  );
}
