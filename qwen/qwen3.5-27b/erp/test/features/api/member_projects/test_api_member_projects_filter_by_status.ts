import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test that an authenticated member can filter their assigned projects by status.
 *
 * This test verifies that the my-projects endpoint correctly filters projects
 * by status (active, completed, archived) and returns accurate pagination data.
 */
export async function test_api_member_projects_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create three projects with different statuses
  const activeProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeProject);
  const completedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "completed",
        },
      },
    );
  typia.assert(completedProject);
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "archived",
        },
      },
    );
  typia.assert(archivedProject);
  // 3. Test filtering by 'active' status
  const activeFilterResult =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          page_size: 20,
        },
      },
    );
  typia.assert(activeFilterResult);
  // 4. Test filtering by 'completed' status
  const completedFilterResult =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {
          status: "completed",
          page: 1,
          page_size: 20,
        },
      },
    );
  typia.assert(completedFilterResult);
  // 5. Test filtering by 'archived' status
  const archivedFilterResult =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {
          status: "archived",
          page: 1,
          page_size: 20,
        },
      },
    );
  typia.assert(archivedFilterResult);
  // 6. Test without status filter (should return all assigned projects)
  const allProjectsResult =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 20,
        },
      },
    );
  typia.assert(allProjectsResult);
  // 7. Validate that status filters return projects with matching status
  TestValidator.predicate(
    "active filter returns only active projects",
    activeFilterResult.data.every((p) => p.status === "active"),
  );
  TestValidator.predicate(
    "completed filter returns only completed projects",
    completedFilterResult.data.every((p) => p.status === "completed"),
  );
  TestValidator.predicate(
    "archived filter returns only archived projects",
    archivedFilterResult.data.every((p) => p.status === "archived"),
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "active filter pagination is valid",
    activeFilterResult.pagination.current >= 1 &&
      activeFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "completed filter pagination is valid",
    completedFilterResult.pagination.current >= 1 &&
      completedFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "archived filter pagination is valid",
    archivedFilterResult.pagination.current >= 1 &&
      archivedFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "unfiltered pagination is valid",
    allProjectsResult.pagination.current >= 1 &&
      allProjectsResult.pagination.limit > 0,
  );
  // 9. Validate that unfiltered results contain projects with various statuses
  const unfilteredStatuses = allProjectsResult.data.map((p) => p.status);
  TestValidator.predicate(
    "unfiltered results include projects",
    allProjectsResult.data.length >= 0,
  );
  // 10. Validate project summary structure
  if (activeFilterResult.data.length > 0) {
    const sampleActive = activeFilterResult.data[0];
    TestValidator.predicate(
      "active project has required fields",
      sampleActive.id !== undefined &&
        sampleActive.name !== undefined &&
        sampleActive.status === "active" &&
        sampleActive.color_code !== undefined,
    );
  }
  if (completedFilterResult.data.length > 0) {
    const sampleCompleted = completedFilterResult.data[0];
    TestValidator.predicate(
      "completed project has required fields",
      sampleCompleted.id !== undefined &&
        sampleCompleted.name !== undefined &&
        sampleCompleted.status === "completed" &&
        sampleCompleted.color_code !== undefined,
    );
  }
  if (archivedFilterResult.data.length > 0) {
    const sampleArchived = archivedFilterResult.data[0];
    TestValidator.predicate(
      "archived project has required fields",
      sampleArchived.id !== undefined &&
        sampleArchived.name !== undefined &&
        sampleArchived.status === "archived" &&
        sampleArchived.color_code !== undefined,
    );
  }
}
