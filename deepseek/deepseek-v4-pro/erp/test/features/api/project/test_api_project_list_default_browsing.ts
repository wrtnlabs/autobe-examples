import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
 * Test default project list browsing for an authenticated member.
 *
 * Verifies that a newly authenticated member can browse the project list endpoint
 * with default settings — no search, no status filter, no custom pagination, and
 * no custom sorting. The response is a paginated list of project summaries
 * scoped to the member's current organization, with each summary containing the
 * project's id, name, color_code, status, and description.
 *
 * Special attention is given to pagination metadata integrity: the pages field
 * must equal the ceiling of total records divided by limit. Each returned
 * project summary must have a valid UUID id, a non-empty name and color code,
 * and a status matching one of the three lifecycle values (active, archived,
 * completed). The description field may be a string or null.
 *
 * 1. Authenticate as a member via join to establish session and organization context.
 * 2. Call the project list endpoint with an empty request body (all defaults).
 * 3. Validate the full response structure with typia.assert.
 * 4. Verify pagination metadata: current page, limit, total records, total pages,
 *    and correct pages computation.
 * 5. Iterate over each project summary to verify id, name, color_code, status,
 *    and description fields are present and well-formed.
 */
export async function test_api_project_list_default_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Browse projects with default settings (no filters)
  const result = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  const pagination = result.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);
  TestValidator.predicate("total pages matches calculation", () => {
    const expected =
      pagination.limit === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit);
    return pagination.pages === expected;
  });
  // 4. Validate each project summary has required fields
  for (const project of result.data) {
    TestValidator.predicate(
      "project id is a non-empty UUID string",
      project.id.length > 0,
    );
    TestValidator.predicate(
      "project has a non-empty display name",
      project.name.length > 0,
    );
    TestValidator.predicate(
      "project has a non-empty color code",
      project.color_code.length > 0,
    );
    TestValidator.predicate(
      "project status is a valid lifecycle value",
      ["active", "archived", "completed"].includes(project.status),
    );
    // description is string | null — typia.assert already validated this
  }
}
