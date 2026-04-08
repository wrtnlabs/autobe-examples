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
 * Test department listing with hierarchical structure validation.
 *
 * Validates the complete department management workflow including member registration,
 * hierarchical department creation with parent-child relationships, and paginated
 * list retrieval. Ensures that departments correctly maintain their hierarchical
 * structure through parent department references and that pagination metadata
 * accurately reflects the department count.
 *
 * Special attention is given to verifying that root-level departments have null
 * parent references while child departments properly reference their parent
 * department with complete summary information including id, name, and organization.
 *
 * 1. Member account creation with initial organization setup.
 * 2. First root-level department creation without parent.
 * 3. Child department creation referencing the first department as parent.
 * 4. Second root-level department creation.
 * 5. Fetch paginated department list from the organization.
 * 6. Validate pagination metadata and department count.
 * 7. Verify hierarchical structure with root and child relationships.
 */
export async function test_api_department_listing_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get join result
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create member connection for subsequent requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = memberConnection.headers || {};
  memberConnection.headers.Authorization = joinResult.token.access;
  // 3. Create first root-level department to get organization ID
  const rootDepartment1 =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: "",
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment1);
  // 4. Extract organization ID from the created department
  const organizationId = rootDepartment1.organization.id;
  typia.assert<string & tags.Format<"uuid">>(organizationId);
  // 5. Update the first department with correct organization ID
  const rootDepartment1Fixed =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: rootDepartment1.name,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment1Fixed);
  // 6. Create child department
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: rootDepartment1Fixed.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 7. Create second root-level department
  const rootDepartment2 =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment2);
  // 8. Fetch department list
  const result =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(result);
  // 9. Validate response structure
  TestValidator.equals(
    "response has pagination",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(result.data),
    true,
  );
  // 10. Validate department count
  TestValidator.equals("total department count", result.data.length, 3);
  // 11. Validate pagination metadata
  const pagination = result.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("default limit", pagination.limit, 20);
  TestValidator.equals("total records", pagination.records, 3);
  TestValidator.equals("total pages", pagination.pages, 1);
  // 12. Validate department structure
  let hasRoot = 0;
  let hasChild = 0;
  for (let i = 0; i < result.data.length; i++) {
    const dept = result.data[i];
    TestValidator.equals(`department ${i} has id`, dept.id !== undefined, true);
    TestValidator.equals(
      `department ${i} has name`,
      dept.name !== undefined,
      true,
    );
    TestValidator.equals(
      `department ${i} has organization`,
      dept.organization !== null,
      true,
    );
    TestValidator.equals(
      `department ${i} has created_at`,
      dept.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      `department ${i} has updated_at`,
      dept.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      `department ${i} has parentDepartment`,
      dept.parentDepartment !== undefined,
      true,
    );
    if (dept.parentDepartment === null) {
      hasRoot++;
    } else {
      hasChild++;
      TestValidator.equals(
        "child has parent ISummary",
        dept.parentDepartment.id !== undefined,
        true,
      );
      TestValidator.equals(
        "child parent has name",
        dept.parentDepartment.name !== undefined,
        true,
      );
    }
  }
  TestValidator.equals("2 root departments", hasRoot, 2);
  TestValidator.equals("1 child department", hasChild, 1);
  // 13. Validate all departments belong to same organization
  for (let i = 0; i < result.data.length; i++) {
    TestValidator.equals(
      `department ${i} organization matches`,
      result.data[i].organization.id,
      organizationId,
    );
  }
}
