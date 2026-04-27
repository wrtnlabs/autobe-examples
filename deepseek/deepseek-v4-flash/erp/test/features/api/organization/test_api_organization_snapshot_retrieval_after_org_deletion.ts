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

export async function test_api_organization_snapshot_retrieval_after_org_deletion(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Join as a member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  //----
  // 2. Create an organization
  //----
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org);
  //----
  // 3. Create a manual snapshot of the active organization
  //----
  const snapshot =
    await generate_random_hrm_time_tracking_member_organizations_snapshots_create(
      memberConnection,
      {
        params: {
          organizationId: org.id,
        },
        body: {
          eventDetails:
            "Pre-deletion baseline snapshot for audit trail validation",
        },
      },
    );
  typia.assert(snapshot);
  //----
  // 4. Delete the organization (owner-only operation)
  //----
  await api.functional.hrmTimeTracking.member.organizations.erase(
    memberConnection,
    {
      organizationId: org.id,
    },
  );
  //----
  // 5. Retrieve the snapshot after organization deletion
  //----
  const retrieved =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.at(
      memberConnection,
      {
        organizationId: org.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrieved);
  //----
  // 6. Validate snapshot integrity
  //----
  // Snapshot status should be 'active' (captured before deletion)
  TestValidator.equals("snapshot status is active", retrieved.status, "active");
  // Snapshot event_type must be 'snapshot' (manual capture)
  TestValidator.equals("snapshot event type", retrieved.event_type, "snapshot");
  // Snapshot preserves organization configuration
  TestValidator.equals("snapshot preserves name", retrieved.name, org.name);
  TestValidator.equals(
    "snapshot preserves currency",
    retrieved.currency,
    org.currency,
  );
  TestValidator.equals(
    "snapshot preserves timezone",
    retrieved.timezone,
    org.timezone,
  );
  TestValidator.equals(
    "snapshot preserves fiscal start month",
    retrieved.fiscal_start_month,
    org.fiscal_start_month,
  );
  // Actor is the member who created the snapshot
  TestValidator.equals(
    "actor email matches member",
    retrieved.actor.email,
    authorized.email,
  );
  // Owner is correctly identified
  TestValidator.equals(
    "owner member id matches organization owner",
    retrieved.owner_member_id,
    org.owner.id,
  );
  TestValidator.equals(
    "owner display name matches organization owner",
    retrieved.owner_display_name,
    org.owner.display_name,
  );
}
