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
 * Test default pagination for project listing endpoint.
 *
 * 1. Authenticate as a new member user
 * 2. Call project list endpoint with empty body (all defaults)
 * 3. Validate response structure and pagination metadata
 * 4. Verify project summary fields
 */
export async function test_api_project_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Prepare request body with defaults
  const body = {} satisfies IHrmPlatformProject.IRequest;
  // 3. Call project list with default parameters
  const response = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    { body },
  );
  typia.assert(response);
  // 4. Validate default pagination values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  // 5. Validate pages calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 7. If projects exist, validate each project summary
  if (response.data.length > 0) {
    // Validate first project as sample
    const firstProject = response.data[0];
    typia.assert(firstProject);
    // Business logic validation: status should be one of valid values
    const validStatuses = ["active", "completed", "archived"] as const;
    TestValidator.predicate(
      "project status is valid",
      validStatuses.includes(
        firstProject.status as (typeof validStatuses)[number],
      ),
    );
    // Verify project has required non-null fields
    TestValidator.predicate("project has id", firstProject.id.length > 0);
    TestValidator.predicate("project has name", firstProject.name.length > 0);
    TestValidator.predicate(
      "project has color_code",
      firstProject.color_code.length > 0,
    );
  }
}
