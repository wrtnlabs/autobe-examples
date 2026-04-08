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

export async function test_api_department_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins account (creates member with initial organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create member connection for department operations
  // Note: authorize_member_join updates the connection headers internally
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = joinConnection.headers;
  // 3. Get organization ID from the join response
  // The member becomes Owner of the organization they create
  const organizationId: string & tags.Format<"uuid"> = joinOutput.member
    .id as string & tags.Format<"uuid">;
  // 4. Create a department within the organization
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(department);
  // 5. Create a snapshot of the department
  const snapshot =
    await generate_random_hrm_platform_member_organizations_departments_snapshots_create(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformDepartmentsSnapshot.ICreate,
        params: {
          organizationId,
          departmentId: department.id,
        },
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot attributes match the source department
  TestValidator.equals(
    "department id match",
    snapshot.department.id,
    department.id,
  );
  TestValidator.equals("name match", snapshot.name, department.name);
  // Validate parent department (both can be null)
  if (department.parentDepartment === null) {
    TestValidator.equals(
      "parent department null",
      snapshot.parentDepartment,
      null,
    );
  } else {
    TestValidator.equals(
      "parent department id match",
      snapshot.parentDepartment?.id,
      department.parentDepartment?.id,
    );
  }
  // Validate timestamps - use toISOString() for comparison
  TestValidator.equals(
    "updated at match",
    snapshot.updatedAt,
    department.updated_at,
  );
  TestValidator.predicate(
    "created at is recent",
    new Date(snapshot.createdAt).getTime() > Date.now() - 60000,
  );
  // Validate snapshot ID is different from department ID
  TestValidator.notEquals(
    "snapshot id differs from department id",
    snapshot.id,
    department.id,
  );
}