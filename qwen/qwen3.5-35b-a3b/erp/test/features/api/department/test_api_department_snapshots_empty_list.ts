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

export async function test_api_department_snapshots_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Get organization ID from session
  const session = memberAuth.sessions?.[0];
  const organization = session?.organization;
  TestValidator.predicate(
    "session has organization",
    () =>
      session !== undefined &&
      organization !== null &&
      organization !== undefined,
  );
  const organizationId = organization!.id;
  // 3. Create a department without any edits
  const department =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(2),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Retrieve snapshots for the newly created department (no edits made)
  const snapshotResult =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.index(
      memberConnection,
      {
        organizationId,
        departmentId: department.id,
        body: typia.random<IHrmPlatformDepartmentsSnapshot.IRequest>(),
      },
    );
  typia.assert(snapshotResult);
  // 5. Validate empty state
  TestValidator.equals(
    "snapshots data array is empty",
    snapshotResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    snapshotResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    snapshotResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1 (default)",
    snapshotResult.pagination.current,
    1,
  );
}
