import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
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
import { generate_random_hrm_time_tracking_member_organizations_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_snapshots_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_organization_snapshot";

export async function test_api_organization_snapshot_creation_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member1 (will create and own the organization)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Create an organization owned by member1
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // 3. Join as member2 (a different user who is NOT the owner)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 4. As member2, attempt to create a snapshot for member1's organization
  //    Should fail with 403 Forbidden — only the owner may create snapshots
  await TestValidator.httpError(
    "non-owner cannot create organization snapshot",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.snapshots.create(
        member2Connection,
        {
          organizationId: organization.id,
          body: {},
        },
      );
    },
  );
  // 5. Verify member1 (the owner) CAN still create a snapshot successfully
  const snapshot =
    await generate_random_hrm_time_tracking_member_organizations_snapshots_create(
      member1Connection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(snapshot);
}
