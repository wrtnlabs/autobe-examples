import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that creating an organization with a duplicate name is rejected with a 409 Conflict error.
 *
 * Validates the uniqueness constraint on organization names across the entire platform. Registers a new member, creates an organization with a unique name, then attempts to create a second organization with the identical name. The duplicate attempt must fail with a 409 status code, while the original organization remains intact.
 *
 * 1. Register a new member via authorize_member_join utility to obtain authentication credentials.
 * 2. Create a first organization with a specific unique name, distinct currency, timezone, and fiscal start month.
 * 3. Attempt to create a second organization with the exact same name but different currency/timezone/fiscal_start_month to isolate the uniqueness constraint.
 * 4. Verify the duplicate attempt returns HTTP 409 Conflict.
 */
export async function test_api_organization_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first organization with a unique name
  const uniqueName: string = RandomGenerator.name();
  const firstOrg: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: uniqueName,
        },
      },
    );
  typia.assert(firstOrg);
  TestValidator.equals("org name matches input", firstOrg.name, uniqueName);
  // 3. Attempt to create a second organization with the same name
  const duplicateBody: IHrmTimeTrackingOrganization.ICreate = {
    name: uniqueName,
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  await TestValidator.httpError(
    "duplicate organization name",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.create(
        memberConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
