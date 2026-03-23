import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member with no project assignments receives an empty paginated list.
 *
 * This test verifies:
 * 1. The response returns an empty data array
 * 2. Pagination metadata shows records=0 and pages=0
 * 3. The current page is 1 (default)
 * 4. The endpoint does not return an error when there are no assigned projects
 * 5. The response structure is consistent with non-empty results
 */
export async function test_api_member_projects_empty_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new member account (not assigned to any projects)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Execute: Call my-projects endpoint with default parameters
  const response =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformProject.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate: Response contains empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate: Pagination shows records=0
  TestValidator.equals("total records is zero", response.pagination.records, 0);
  // 5. Validate: Pagination shows pages=0
  TestValidator.equals("total pages is zero", response.pagination.pages, 0);
  // 6. Validate: Current page is 1 (default)
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  // 7. Validate: Limit is set (default value)
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
}
