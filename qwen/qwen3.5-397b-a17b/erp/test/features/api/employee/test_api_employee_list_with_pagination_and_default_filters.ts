import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test employee list with pagination and default filters.
 *
 * This test verifies the employee listing endpoint within an organization context:
 * 1. Member joins and creates an organization
 * 2. Organization is selected as active context
 * 3. Multiple employee invitations are created to populate the organization
 * 4. Employee list is retrieved with default pagination
 * 5. Response structure and pagination metadata are validated
 * 6. Each employee summary contains all required fields
 */
export async function test_api_employee_list_with_pagination_and_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization for employee context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select the created organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals("organization matches", selectedOrg.id, organization.id);
  // 4. Create multiple employee invitations to populate organization
  const invitationCount = 5;
  for (let i = 0; i < invitationCount; i++) {
    const invitation =
      await generate_random_hrm_platform_member_invitations_create(
        memberConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            role_id: typia.random<string & tags.Format<"uuid">>(),
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies IHrmPlatformInvitation.ICreate,
        },
      );
    typia.assert(invitation);
  }
  // 5. Retrieve employee list with default pagination (no filters)
  const employeeList = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  // 6. Validate pagination metadata business logic
  TestValidator.predicate(
    "current page is at least 1",
    employeeList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    employeeList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    employeeList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    employeeList.pagination.pages >= 0,
  );
  // 7. Validate each employee in the list
  for (const employee of employeeList.data) {
    // Validate user profile has required fields
    TestValidator.predicate(
      "user has display_name",
      employee.user.display_name.length > 0,
    );
    // Validate role assignment
    TestValidator.predicate("role has name", employee.role.name.length > 0);
    // Validate employment_type and status are populated
    TestValidator.predicate(
      "employment_type is not empty",
      employee.employment_type.length > 0,
    );
    TestValidator.predicate("status is not empty", employee.status.length > 0);
    // Validate created_at timestamp exists
    TestValidator.predicate(
      "created_at is valid date-time",
      employee.created_at.length > 0,
    );
  }
}
