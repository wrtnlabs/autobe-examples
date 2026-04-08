import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee self-service contract list retrieval with pagination.
 *
 * Validates that an authenticated member can retrieve their employment contract list through the self-service endpoint. The endpoint returns paginated contract summaries including both active contracts (end_date is NULL) and historical contracts (end_date is populated), with full compensation details and employee reference information.
 *
 * The test verifies the complete response structure including pagination metadata, contract identification fields, compensation details, and audit timestamps. When no contracts exist for the employee, the endpoint returns an empty data array with valid pagination metadata.
 *
 * **Note**: Full authorization testing (verifying member can only access their own contracts) requires employee creation APIs which are not available in the current SDK. This test focuses on response structure validation and pagination functionality.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Authenticate the member and create a connection with the authorization token.
 * 3. Call the contract list endpoint with an employee ID and empty request body.
 * 4. Validate the response includes proper pagination metadata (current, limit, records, pages).
 * 5. If contracts exist, validate contract summary structure (id, dates, compensation, employee reference).
 * 6. Test pagination parameters (page, limit) and verify they are reflected in the response.
 */
export async function test_api_contract_list_employee_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test contract list retrieval with random employee ID
  const contractList: IPageIHrmContract.ISummary =
    await api.functional.hrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IHrmContract.IRequest,
      },
    );
  typia.assert(contractList);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    contractList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    contractList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    contractList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    contractList.pagination.pages >= 0,
  );
  // 4. Test with pagination parameters
  const paginatedList: IPageIHrmContract.ISummary =
    await api.functional.hrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmContract.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals(
    "pagination limit matches request",
    paginatedList.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page matches request",
    paginatedList.pagination.current,
    1,
  );
}
