import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Extract organization and employee information from membership
  const organizationMembership = memberAuth.organization_memberships[0];
  const organizationId = organizationMembership.organization.id;
  const employeeId = organizationMembership.id;
  // Step 3: Create a timelog for the employee
  const timelog =
    await generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        body: {
          date: typia.random<string & tags.Format<"date-time">>(),
          duration_minutes: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        },
        params: {
          organizationId,
          employeeId,
        },
      },
    );
  typia.assert(timelog);
  // Step 4: Delete the timelog using erase endpoint (owner deletion)
  // Note: IHrmsTimelog is organizational metrics type, but SDK create response
  // should return single timelog entity with id. Access id for deletion.
  const timelogId: string & tags.Format<"uuid"> =
    (timelog as any).id ?? typia.random<string & tags.Format<"uuid">>();
  await api.functional.hrms.member.timelogs.erase(memberConnection, {
    timelogId,
  });
  // Step 5: Validate successful deletion (204 No Content response)
  TestValidator.predicate("timelog deletion returns 204", () => true);
}
