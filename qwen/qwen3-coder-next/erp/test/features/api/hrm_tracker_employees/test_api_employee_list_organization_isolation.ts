import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_employee_list_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first organization with member and employee
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await api.functional.hrmTracker.auth.member.join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member1);
  const org1 = await api.functional.hrmTracker.member.organizations.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "UTC",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org1);
  const employee1 = await api.functional.hrmTracker.member.employees.create(
    member1Connection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Developer",
        department_id: null,
        role_id: null,
        organization_id: org1.id,
        user_id: member1.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee1);
  // 2. Create second organization with different member and employee
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await api.functional.hrmTracker.auth.member.join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member2);
  const org2 = await api.functional.hrmTracker.member.organizations.create(
    member2Connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "EUR",
        timezone: "Europe/London",
        fiscal_start_month: 4,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org2);
  const employee2 = await api.functional.hrmTracker.member.employees.create(
    member2Connection,
    {
      body: {
        employment_type: "part-time",
        status: "active",
        position: "Designer",
        department_id: null,
        role_id: null,
        organization_id: org2.id,
        user_id: member2.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee2);
  // 3. Authenticate as member1 and verify organization isolation
  const auth1Connection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(auth1Connection, {
    body: {
      email: member1.email,
      password: "password123",
      display_name: member1.display_name,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 4. Fetch first page of employees for member1's organization
  const page1 = await api.functional.hrmTracker.employees.index(
    auth1Connection,
    {
      body: {
        status: "active",
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        position: "",
        cursor: "0",
        limit: 10,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(page1);
  // 5. Validate results: only employee from org1 should be returned
  TestValidator.equals("first page has 1 employee", page1.data.length, 1);
  TestValidator.equals(
    "employee belongs to org1",
    page1.data[0].user.id,
    member1.id,
  );
  TestValidator.equals(
    "employee status matches",
    page1.data[0].status,
    "active",
  );
  // 6. Validate pagination structure
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.equals("pagination records", page1.pagination.records, 1);
  TestValidator.equals("pagination pages", page1.pagination.pages, 1);
  // 7. Verify no employee from org2 appears in org1's results
  const org2EmployeeIds = page1.data.map((e: any) => e.user.id);
  TestValidator.notEquals(
    "org2 employee not in org1 results",
    org2EmployeeIds.includes(member2.id),
    true,
  );
}