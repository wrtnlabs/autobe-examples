import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
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

export async function test_api_organization_deletion_by_owner_with_conditions_met(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization as owner
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_image_uri: null,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employees
  const employees: IHrmTrackerEmployee[] = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const memberConnection: api.IConnection = { host: connection.host };
      const member = typia.random<IHrmTrackerMember.IJoin>();
      const authed = await api.functional.hrmTracker.auth.member.join(
        memberConnection,
        {
          body: member,
        },
      );
      typia.assert(authed);
      return api.functional.hrmTracker.member.employees.create(
        ownerConnection,
        {
          body: {
            employment_type: "full-time" as const,
            status: "active" as const,
            position: RandomGenerator.name(),
            department_id: null,
            role_id: null,
            organization_id: organization.id,
            user_id: authed.id,
          } satisfies IHrmTrackerEmployee.ICreate,
        },
      );
    }),
  );
  typia.assert(employees);
  // 4. Skip timesheet creation since no 'create' or list endpoints exist
  // For the real scenario, employees would have submitted timesheets for approval
  // 5. Skip invitation creation since no 'create' endpoint exists
  // Only deletion is supported for invitations
  // 6. Call delete endpoint
  await api.functional.hrmTracker.member.organizations.erase(ownerConnection, {
    organizationId: organization.id,
  });
  // 7. Verify owner account is still functional by creating a new organization
  const newOrganization =
    await api.functional.hrmTracker.member.organizations.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_image_uri: null,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(newOrganization);
  // 8. Verify new organization is different from deleted one
  TestValidator.notEquals(
    "new organization is different",
    newOrganization.id,
    organization.id,
  );
}
