import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test free-text search against timer descriptions with case-insensitive partial matching.
 *
 * Validates that the timer list search endpoint correctly performs case-insensitive
 * partial matching against the description field of active timers. Confirms that search
 * results include timers whose description contains the search keyword regardless of
 * letter casing, and excludes timers whose description does not match.
 *
 * Also verifies that the search is scoped to the description field only — searching with
 * a keyword extracted from the project name does not return the timer, proving that the
 * search does not match against project names or other non-description fields.
 *
 * 1. Authenticate a member via join to establish an organization-scoped session.
 * 2. Create a project within the organization for timer context.
 * 3. Assign the authenticated employee as a project member.
 * 4. Start a timer with the distinctive description "Refactoring the authentication module".
 * 5. Search with matching substring "authentication" and confirm the timer appears in results.
 * 6. Search with a non-matching keyword and verify the timer is excluded.
 * 7. Search with uppercase "AUTHENTICATION" to confirm case-insensitive matching.
 * 8. Search with a word from the project name to verify search is description-only.
 */
export async function test_api_timer_list_search_by_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Start timer with distinctive description
  const timerDescription = "Refactoring the authentication module";
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // 5. Search with matching substring
  const matchResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        search: "authentication",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(matchResult);
  TestValidator.predicate(
    "timer found with matching substring search",
    matchResult.data.some((t) => t.id === timer.id),
  );
  // 6. Search with non-matching keyword
  const noMatchResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        search: "zyxwvutsrqponmlkjihgfedcba_nonexistent",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.predicate(
    "timer excluded with non-matching search keyword",
    !noMatchResult.data.some((t) => t.id === timer.id),
  );
  // 7. Case-insensitive search
  const caseInsensitiveResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        search: "AUTHENTICATION",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "timer found with case-insensitive search",
    caseInsensitiveResult.data.some((t) => t.id === timer.id),
  );
  // 8. Verify search is description-only (not project name)
  const projectNameWord = project.name.split(" ")[0];
  const projectNameSearchResult =
    await api.functional.erpHrm.member.timers.index(memberConnection, {
      body: {
        search: projectNameWord,
      } satisfies IErpHrmTimer.IRequest,
    });
  typia.assert(projectNameSearchResult);
  TestValidator.predicate(
    "search is description-only, timer not found by project name keyword",
    !projectNameSearchResult.data.some((t) => t.id === timer.id),
  );
}
