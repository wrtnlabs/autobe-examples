import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test verifying timer listing filtering by project ID.
 *
 * Authenticates a new member to establish an organization context. Constructs a timer list request with a random UUID for the `projectId` filter. Invokes the timer index endpoint to validate that the API correctly accepts the project-based scope filter and returns the expected paginated response structure containing timer summaries.
 *
 * 1. Member authentication via `authorize_member_join`.
 * 2. Timer index API call with `IHrmPlatformTimer.IRequest` with `projectId`.
 * 3. Response type validation using `typia.assert` against `IPageIHrmPlatformTimer.ISummary`.
 * 4. Pagination and data structure verification using `TestValidator`.
 */
export async function test_api_timer_list_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish an organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Prepare filter criteria
  // Generate a random UUID to simulate filtering by a specific project.
  // This validates that the API correctly accepts the projectId filter parameter
  // and scopes the query, even if no timers exist for this random ID.
  const filterProjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Execute timer listing with project filter
  const timersResponse: IPageIHrmPlatformTimer.ISummary =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        projectId: filterProjectId,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  // 4. Validate response structure
  typia.assert(timersResponse);
  // 5. Verify pagination and data fields presence
  TestValidator.predicate(
    "response has pagination",
    timersResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(timersResponse.data),
  );
  // Verify that the result is scoped (empty is expected for random ID, structure is key)
  TestValidator.equals(
    "timer list for non-existent project is empty",
    timersResponse.data.length,
    0,
  );
}
