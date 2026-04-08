import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
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
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_create_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(joinResult);
  // Extract organization ID from member's first session
  const session = typia.assert(joinResult.sessions?.[0]!);
  const organizationSummary = typia.assert(session.organization!);
  const organizationId: string = organizationSummary.id;
  typia.assert(organizationId);
  // Step 2: Create first department with "Sales" name
  const deptConnection: api.IConnection = { host: connection.host };
  const departmentName: string = "Sales";
  const firstDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      deptConnection,
      {
        organizationId,
        body: {
          name: departmentName,
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(firstDepartment);
  // Step 3: Attempt to create duplicate department with same name (should fail)
  await TestValidator.error(
    "duplicate department name within organization",
    async () => {
      await api.functional.hrmPlatform.member.organizations.departments.create(
        deptConnection,
        {
          organizationId,
          body: {
            name: departmentName,
            parent_department_id: null,
          } satisfies IHrmPlatformDepartment.ICreate,
        },
      );
    },
  );
}
