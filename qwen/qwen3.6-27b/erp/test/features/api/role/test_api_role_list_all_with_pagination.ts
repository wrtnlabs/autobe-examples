import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all roles with pagination.
 *
 * Validates the complete role listing flow including member authentication and paginated role retrieval. Ensures that the response includes proper pagination metadata and that each role summary contains all expected fields. Special attention is given to verifying that built-in platform roles appear in the unfiltered results and that the pagination structure is correctly populated.
 *
 * 1. Member registers and authenticates to establish organization context.
 * 2. Lists all roles without any filters using empty request body.
 * 3. Validates paginated response structure and pagination metadata.
 * 4. Verifies each role summary contains required fields (id, name, builtIn, description, createdAt, updatedAt).
 * 5. Confirms built-in platform roles (Owner, Manager, Employee) are present in results.
 * 6. Validates results are sorted by createdAt in descending order.
 */
export async function test_api_role_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {} satisfies Partial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(authorizedMember);
  // 2. List all roles without filters
  const request = {} satisfies IHrmPlatformRole.IRequest;
  const response = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    { body: request },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "current page defaults to 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data count does not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );
  TestValidator.predicate(
    "response data count does not exceed total records",
    response.data.length <= response.pagination.records,
  );
  // 4. Validate each role summary (typia.assert already validates structure)
  for (const _role of response.data) {
    typia.assert(_role);
  }
  // 5. Confirm built-in platform roles are present
  const builtInRoleNames = response.data
    .filter((role) => role.builtIn === true)
    .map((role) => role.name);
  TestValidator.predicate(
    "Owner role exists",
    builtInRoleNames.includes("Owner"),
  );
  TestValidator.predicate(
    "Manager role exists",
    builtInRoleNames.includes("Manager"),
  );
  TestValidator.predicate(
    "Employee role exists",
    builtInRoleNames.includes("Employee"),
  );
  // 6. Validate results are sorted by createdAt in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentCreated = new Date(response.data[i].createdAt).getTime();
      const nextCreated = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `createdAt descending order at index ${i}`,
        currentCreated >= nextCreated,
      );
    }
  }
}
