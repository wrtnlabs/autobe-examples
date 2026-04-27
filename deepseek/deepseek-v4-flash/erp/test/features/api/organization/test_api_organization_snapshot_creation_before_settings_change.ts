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

export async function test_api_organization_snapshot_creation_before_settings_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a new member who will own the organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a new organization — the authenticated member becomes the owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a manual snapshot before making settings changes
  const eventDetails: string =
    "Capturing configuration before currency change from USD to EUR";
  const snapshot =
    await generate_random_hrm_time_tracking_member_organizations_snapshots_create(
      memberConnection,
      {
        body: {
          eventDetails,
        } satisfies IHrmTimeTrackingOrganizationSnapshot.ICreate,
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(snapshot);
  // Step 4-5: Validate organization reference in snapshot
  TestValidator.equals(
    "snapshot organization id",
    snapshot.organization.id,
    organization.id,
  );
  // Step 6: Validate denormalized fields match current organization state
  TestValidator.equals("snapshot name", snapshot.name, organization.name);
  TestValidator.equals(
    "snapshot description",
    snapshot.description,
    organization.description,
  );
  TestValidator.equals(
    "snapshot currency",
    snapshot.currency,
    organization.currency,
  );
  TestValidator.equals(
    "snapshot timezone",
    snapshot.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "snapshot fiscal_start_month",
    snapshot.fiscal_start_month,
    organization.fiscal_start_month,
  );
  // Step 7: Validate actor matches the authenticated member
  TestValidator.equals("actor id", snapshot.actor.id, member.id);
  TestValidator.equals(
    "actor display_name",
    snapshot.actor.display_name,
    member.display_name,
  );
  // Step 7: Validate owner fields match the organization's owner
  TestValidator.equals(
    "owner_member_id",
    snapshot.owner_member_id,
    organization.owner.id,
  );
  TestValidator.equals(
    "owner_display_name",
    snapshot.owner_display_name,
    organization.owner.display_name,
  );
  // Step 5: Validate status, event_type, event_details
  TestValidator.equals("status", snapshot.status, "active");
  TestValidator.equals("event_type", snapshot.event_type, "snapshot");
  TestValidator.equals("event_details", snapshot.event_details, eventDetails);
}
