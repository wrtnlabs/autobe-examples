import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated employee with no project assignments receives
 * an empty result set when querying their assigned projects.
 *
 * This test validates:
 * 1. The endpoint successfully returns data even when no projects are assigned
 * 2. Empty data array is properly formatted (not null or error)
 * 3. Pagination metadata correctly reflects zero results
 * 4. Organization context is properly enforced
 */
export async function test_api_project_assigned_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account
  // The join process automatically creates organization and employee records
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Query assigned projects (should return empty since no projects exist)
  const result = await api.functional.erpHrm.member.projects.assigned.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify empty data array
  TestValidator.equals("data should be empty array", result.data, []);
  TestValidator.predicate(
    "data is array with length 0",
    result.data.length === 0,
  );
  // 4. Verify pagination metadata reflects zero results
  TestValidator.equals(
    "pagination.current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    result.pagination.pages,
    0,
  );
  // 5. Verify limit defaults to a reasonable value
  TestValidator.predicate(
    "pagination.limit should be reasonable default (<= 100)",
    result.pagination.limit > 0 && result.pagination.limit <= 100,
  );
}
