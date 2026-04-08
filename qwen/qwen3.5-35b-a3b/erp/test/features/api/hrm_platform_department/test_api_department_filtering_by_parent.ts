import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test department listing with parent department filtering to validate hierarchical structure queries.
 *
 * This scenario ensures users can filter departments by their parent department relationship.
 * Validates the complete department creation and filtering flow, ensuring hierarchical
 * relationships are correctly maintained and queried.
 *
 * 1. Member registers with organization creation
 * 2. Create root-level department with null parent
 * 3. Create child department with root as parent
 * 4. Create second root-level department
 * 5. Filter by parent_department_id to get only child departments
 * 6. Filter with null parent_department_id to get only root departments
 * 7. Validate pagination and filtering results
 */
export async function test_api_department_filtering_by_parent(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  const member: IHrmPlatformMember.IAuthorized = auth;
  // Extract organization ID from the join response
  // The organization is created as part of the join flow
  const authWithOrg = auth as typeof auth & {
    organization: IHrmPlatformOrganization.ISummary;
  };
  const organizationId: string = authWithOrg.organization.id;
  // Create root-level department (parent_department_id = null)
  const rootDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment);
  // Create child department with root as parent
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          parent_department_id: rootDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // Create second independent root department
  const secondRootDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(secondRootDepartment);
  // Filter by parent_department_id - should only return child department
  const filteredWithParent =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: rootDepartment.id,
          limit: 100,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(filteredWithParent);
  // Validate filtered results
  TestValidator.equals(
    "only child department returned",
    filteredWithParent.data.length,
    1,
  );
  TestValidator.equals(
    "child department id matches",
    filteredWithParent.data[0].id,
    childDepartment.id,
  );
  // Get all departments (no filter)
  const allDepartments =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 100,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(allDepartments);
  TestValidator.equals(
    "total departments count",
    allDepartments.data.length,
    3,
  );
  TestValidator.equals(
    "pagination records matches total",
    allDepartments.pagination.records,
    3,
  );
  // Filter with null parent_department_id - should only return root departments
  const rootOnlyDepartments =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: null,
          limit: 100,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(rootOnlyDepartments);
  TestValidator.equals(
    "root departments count with null filter",
    rootOnlyDepartments.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records for root only",
    rootOnlyDepartments.pagination.records,
    2,
  );
  // Verify correct root departments are returned
  const rootIds = rootOnlyDepartments.data
    .map((d) => d.id)
    .sort()
    .join(",");
  const expectedRootIds = [rootDepartment.id, secondRootDepartment.id]
    .sort()
    .join(",");
  TestValidator.equals(
    "correct root departments returned",
    rootIds,
    expectedRootIds,
  );
  // Verify child department has correct parent reference
  const childFilteredDepartment = filteredWithParent.data[0];
  TestValidator.equals(
    "child has root as parent",
    childFilteredDepartment.parentDepartment?.id,
    rootDepartment.id,
  );
}
