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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentsSnapshot";
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

export async function test_api_department_snapshots_retrieve_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 2. Create initial department to obtain organization ID
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const initialDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        },
      },
    );
  typia.assert(initialDepartment);
  // 3. Create additional departments to generate snapshots
  const departmentIds: string[] = [initialDepartment.id];
  const additionalDepartments = ArrayUtil.repeat(2, () => ({
    name: RandomGenerator.name(),
    parent_department_id: initialDepartment.id,
  }));
  for (const dept of additionalDepartments) {
    const departmentResult =
      await api.functional.hrmPlatform.member.organizations.departments.create(
        memberConnection,
        {
          organizationId,
          body: dept,
        },
      );
    typia.assert(departmentResult);
    departmentIds.push(departmentResult.id);
  }
  // 4. Retrieve snapshot history for the initial department
  const snapshotBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "-",
  } satisfies IHrmPlatformDepartmentsSnapshot.IRequest;
  const snapshotsResponse =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId,
        departmentId: initialDepartment.id,
        body: snapshotBody,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination structure
  TestValidator.equals(
    `pagination current for dept ${initialDepartment.id}`,
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    `pagination limit for dept ${initialDepartment.id}`,
    snapshotsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    `pagination records non-negative for dept ${initialDepartment.id}`,
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    `pagination pages non-negative for dept ${initialDepartment.id}`,
    snapshotsResponse.pagination.pages >= 0,
  );
  // 6. Validate snapshot data
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    // Validate snapshot has department reference
    TestValidator.predicate(
      `snapshot has department reference for dept ${initialDepartment.id}`,
      snapshot.department !== undefined,
    );
    TestValidator.equals(
      `snapshot department id for dept ${initialDepartment.id}`,
      snapshot.hrmPlatformDepartmentId,
      initialDepartment.id,
    );
    // Validate department belongs to correct organization
    if (snapshot.department) {
      TestValidator.equals(
        `snapshot organization id for dept ${initialDepartment.id}`,
        snapshot.department.organization.id,
        organizationId,
      );
    }
    // Validate timestamp exists
    TestValidator.predicate(
      `snapshot has creation timestamp for dept ${initialDepartment.id}`,
      snapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      `snapshot has update timestamp for dept ${initialDepartment.id}`,
      snapshot.updatedAt !== undefined,
    );
  }
  // 7. Validate sorting (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prev = snapshotsResponse.data[i - 1];
      const curr = snapshotsResponse.data[i];
      TestValidator.predicate(
        `snapshots sorted by created_at descending for dept ${initialDepartment.id}`,
        prev.createdAt !== undefined &&
          curr.createdAt !== undefined &&
          prev.createdAt >= curr.createdAt,
      );
    }
  }
  // 8. Validate data isolation - all snapshots belong to same organization
  const allOrgIds = new Set(
    snapshotsResponse.data.map((s) => s.department?.organization.id),
  );
  TestValidator.equals(
    "all snapshots belong to same organization",
    allOrgIds.size,
    1,
  );
}
