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

export async function test_api_organization_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member (establishes authenticated session)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (member becomes the owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `snapshot-test-${RandomGenerator.alphaNumeric(6)}`,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          description: "Org for snapshot testing",
        } satisfies DeepPartial<IHrmTimeTrackingOrganization.ICreate>,
      },
    );
  typia.assert(organization);
  // 3. Create a manual organization snapshot with event details
  const eventDetails = "Pre-configuration change baseline";
  const createdSnapshot =
    await generate_random_hrm_time_tracking_member_organizations_snapshots_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          eventDetails,
        } satisfies DeepPartial<IHrmTimeTrackingOrganizationSnapshot.ICreate>,
      },
    );
  typia.assert(createdSnapshot);
  // 4. Retrieve the snapshot by its unique identifier
  const snapshot =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.at(
      memberConnection,
      {
        organizationId: organization.id,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot belongs to the correct organization
  TestValidator.equals(
    "organization reference",
    snapshot.organization.id,
    organization.id,
  );
  // 6. Validate event type classification
  TestValidator.equals("event type", snapshot.event_type, "snapshot");
  // 7. Validate denormalized fields match current organization state
  TestValidator.equals("organization name", snapshot.name, organization.name);
  TestValidator.equals(
    "organization description",
    snapshot.description,
    organization.description,
  );
  TestValidator.equals(
    "organization currency",
    snapshot.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone",
    snapshot.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "fiscal start month",
    snapshot.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.equals(
    "organization status",
    snapshot.status,
    organization.status,
  );
  // 8. Validate actor identity (the authenticated member who triggered the snapshot)
  TestValidator.equals("actor id", snapshot.actor.id, member.id);
  TestValidator.equals("actor email", snapshot.actor.email, member.email);
  TestValidator.equals(
    "actor display name",
    snapshot.actor.display_name,
    member.display_name,
  );
  // 9. Validate owner identity (the member owns the organization)
  TestValidator.equals("owner member id", snapshot.owner_member_id, member.id);
  TestValidator.equals(
    "owner display name",
    snapshot.owner_display_name,
    member.display_name,
  );
  // 10. Validate event details match
  TestValidator.equals("event details", snapshot.event_details, eventDetails);
  // 11. Validate created_at timestamp is present (format validated by typia.assert)
  TestValidator.predicate("created_at is present", !!snapshot.created_at);
}
