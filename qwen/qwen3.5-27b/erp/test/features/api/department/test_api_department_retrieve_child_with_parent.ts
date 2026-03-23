import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_retrieve_child_with_parent(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a child department (subdepartment) and verify the parent relationship is correctly included in the response.
   * 1. Admin authenticates and creates parent department
   * 2. Admin creates child department with parent reference
   * 3. Member authenticates and retrieves child department
   * 4. Validate parent relationship and hierarchy constraints
   */
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@department-test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create parent department (top-level, no parent_id)
  const parentDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Engineering",
          description: "Software development and technical operations",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department with parent reference
  const childDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Backend Team",
          description: "Backend development team under Engineering",
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Member setup - create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@department-test.com",
      password: "1234",
      href: "https://example.com/member/login",
      referrer: "https://example.com/member",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 5. Retrieve child department using member endpoint
  const retrievedChildDepartment =
    await api.functional.hrmPlatform.member.departments.at(memberConnection, {
      departmentId: childDepartment.id,
    });
  typia.assert(retrievedChildDepartment);
  // 6. Validate parent relationship
  TestValidator.equals(
    "child department id matches",
    retrievedChildDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name matches",
    retrievedChildDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "child department description matches",
    retrievedChildDepartment.description,
    childDepartment.description,
  );
  // 7. Verify parent relationship is correctly included
  TestValidator.predicate(
    "parent relationship exists",
    retrievedChildDepartment.parent !== null,
  );
  if (retrievedChildDepartment.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      retrievedChildDepartment.parent.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrievedChildDepartment.parent.name,
      parentDepartment.name,
    );
  }
  // 8. Verify one-level hierarchy constraint (child departments cannot have their own children)
  TestValidator.equals(
    "child department has no subdepartments",
    retrievedChildDepartment.childDepartments.length,
    0,
  );
  // 9. Verify organization reference is present
  TestValidator.predicate(
    "organization reference exists",
    retrievedChildDepartment.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization name exists",
    retrievedChildDepartment.organization.name !== undefined,
  );
}
