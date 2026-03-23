import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test retrieving project snapshots for a project with no snapshots.
 * Validates proper handling of empty result sets with correct pagination metadata.
 */
export async function test_api_project_snapshot_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new project without any snapshots
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Retrieve snapshots with default parameters (should be empty)
  const emptyResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(emptyResponse);
  // 4. Validate empty response structure
  TestValidator.equals("data array is empty", emptyResponse.data.length, 0);
  TestValidator.equals(
    "current page is 1",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", emptyResponse.pagination.limit, 20);
  TestValidator.equals(
    "records count is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", emptyResponse.pagination.pages, 0);
  // 5. Test with date range filter on empty project
  const fromDate = new Date().toISOString();
  const toDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const dateFilteredResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          from_date: fromDate,
          to_date: toDate,
        },
      },
    );
  typia.assert(dateFilteredResponse);
  TestValidator.equals(
    "date filtered data is empty",
    dateFilteredResponse.data.length,
    0,
  );
  TestValidator.equals(
    "date filtered records is 0",
    dateFilteredResponse.pagination.records,
    0,
  );
  // 6. Test with creator filter on empty project
  const creatorId = typia.random<string & tags.Format<"uuid">>();
  const creatorFilteredResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          created_by_id: creatorId,
        },
      },
    );
  typia.assert(creatorFilteredResponse);
  TestValidator.equals(
    "creator filtered data is empty",
    creatorFilteredResponse.data.length,
    0,
  );
  TestValidator.equals(
    "creator filtered records is 0",
    creatorFilteredResponse.pagination.records,
    0,
  );
  // 7. Test with pagination parameters on empty project
  const paginatedResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated data is empty",
    paginatedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "paginated current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated limit is 10",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated records is 0",
    paginatedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated pages is 0",
    paginatedResponse.pagination.pages,
    0,
  );
}
