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
import type { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
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
 * Test project membership listing with pagination.
 *
 * This test validates the primary success path for retrieving project members
 * with pagination. It creates a project, assigns multiple employees to it,
 * and verifies that the paginated response contains correct membership data
 * with properly nested employee information.
 */
export async function test_api_project_membership_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create multiple project memberships (3 employees)
  const memberships = await ArrayUtil.asyncRepeat(3, async () => {
    const membership =
      await generate_random_hrm_platform_member_projects_memberships_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {},
        },
      );
    typia.assert(membership);
    return membership;
  });
  // 4. List project memberships with pagination (default page 1, limit 20)
  const result =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(result);
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.equals(
    "records count matches memberships",
    result.pagination.records,
    3,
  );
  TestValidator.equals("pages is 1", result.pagination.pages, 1);
  // 6. Verify data array contains 3 memberships
  TestValidator.equals("data array length is 3", result.data.length, 3);
  // 7. Verify each membership has correct role values
  await ArrayUtil.asyncForEach(result.data, async (membership, index) => {
    TestValidator.predicate(`membership ${index} role is valid`, () => {
      return membership.role === "member" || membership.role === "project-lead";
    });
    // 8. Verify employee exists and has valid status
    TestValidator.predicate(
      `employee ${index} exists`,
      () => membership.employee !== undefined,
    );
    TestValidator.predicate(`employee ${index} status is valid`, () => {
      return (
        membership.employee.status === "active" ||
        membership.employee.status === "deactivated"
      );
    });
    // 9. Verify employee has member information
    TestValidator.predicate(
      `employee ${index} has member`,
      () => membership.employee.member !== undefined,
    );
    TestValidator.predicate(
      `employee ${index} member has email`,
      () => membership.employee.member.email !== undefined,
    );
    // 10. Verify employee has role information
    TestValidator.predicate(
      `employee ${index} has role`,
      () => membership.employee.role !== undefined,
    );
  });
}
