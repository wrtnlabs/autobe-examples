import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_organizations_departments_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_snapshots_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_departments_snapshot } from "../../../prepare/prepare_random_hrm_platform_departments_snapshot";

export async function test_api_department_snapshot_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to create account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // Create connection with authorization token for member operations
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    ...memberAuthConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Create root-level department
  const rootDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment);
  const organizationId = rootDepartment.organization.id;
  // 3. Create child department with root department as parent
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: rootDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Create snapshot of the child department
  const snapshot =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.create(
      memberAuthConnection,
      {
        organizationId,
        departmentId: childDepartment.id,
        body: {},
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot preserves parent department relationship
  TestValidator.predicate(
    "snapshot has parent department",
    snapshot.parentDepartment != null,
  );
  if (snapshot.parentDepartment != null) {
    const parentDept = snapshot.parentDepartment;
    TestValidator.equals(
      "parent department id matches root",
      parentDept.id,
      rootDepartment.id,
    );
    TestValidator.equals(
      "parent department name matches root",
      parentDept.name,
      rootDepartment.name,
    );
    TestValidator.equals(
      "snapshot department id matches child",
      snapshot.department.id,
      childDepartment.id,
    );
    TestValidator.equals(
      "snapshot department name matches child",
      snapshot.name,
      childDepartment.name,
    );
    TestValidator.equals(
      "organization matches in snapshot",
      snapshot.department.organization.id,
      organizationId,
    );
  }
}
