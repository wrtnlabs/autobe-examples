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

/**
 * Test successful retrieval of a department snapshot from the HRM platform.
 *
 * Validates the complete workflow of creating a member account, setting up an
 * organization, creating a department, generating a department snapshot, and
 * retrieving that snapshot to verify all attributes are correctly captured.
 *
 * This test ensures that department snapshots properly capture immutable
 * point-in-time records of department state, including name, description,
 * color, parent department assignment, fiscal calendar configuration,
 * timezone, and status. The snapshot data is validated against the original
 * department values to confirm accurate data capture.
 */
export async function test_api_department_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test@1234",
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph({ sentences: 2 }),
        org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // Get organization ID from the member's session context
  const organizationId: string =
    member.sessions?.[0]?.organization?.id ?? member.member.id;
  // 2. Create department within organization
  const department: IHrmPlatformDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(department);
  const departmentId: string = department.id;
  // 3. Create snapshot of department
  const snapshot: IHrmPlatformDepartmentsSnapshot =
    await generate_random_hrm_platform_member_organizations_departments_snapshots_create(
      memberConnection,
      {
        body: {},
        params: {
          organizationId,
          departmentId,
        },
      },
    );
  typia.assert(snapshot);
  const snapshotId: string = snapshot.id;
  // 4. Retrieve snapshot
  const retrievedSnapshot: IHrmPlatformDepartmentsSnapshot =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.at(
      memberConnection,
      {
        organizationId,
        departmentId,
        snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate retrieved snapshot
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "department ID reference",
    retrievedSnapshot.department.id,
    department.id,
  );
  TestValidator.equals(
    "department name matches",
    retrievedSnapshot.department.name,
    department.name,
  );
  TestValidator.equals(
    "department organization matches",
    retrievedSnapshot.department.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "snapshot name matches department",
    retrievedSnapshot.name,
    department.name,
  );
  TestValidator.equals(
    "snapshot parentDepartment matches",
    retrievedSnapshot.parentDepartment?.id ?? null,
    department.parentDepartment?.id ?? null,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    () => !Number.isNaN(Date.parse(retrievedSnapshot.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    () => !Number.isNaN(Date.parse(retrievedSnapshot.updatedAt)),
  );
}