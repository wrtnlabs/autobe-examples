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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationSnapshot";
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

export async function test_api_organization_snapshot_browse_full_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: { email, display_name: displayName },
  });
  typia.assert(authorized);
  // 2. Create a new organization with known attributes
  const organizationName = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Browse organization snapshots with default pagination (no filters)
  const snapshotPage =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {} satisfies IHrmTimeTrackingOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", snapshotPage.pagination.current, 1);
  TestValidator.predicate(
    "records count",
    snapshotPage.pagination.records >= 1,
  );
  TestValidator.predicate("pages count", snapshotPage.pagination.pages >= 1);
  // 5. Validate data array contains at least 1 snapshot record
  TestValidator.predicate(
    "has snapshot records",
    snapshotPage.data.length >= 1,
  );
  // 6. Validate the first (most recent) snapshot
  const snapshot = snapshotPage.data[0];
  TestValidator.equals("event type is created", snapshot.event_type, "created");
  TestValidator.equals(
    "organization status is active",
    snapshot.status,
    "active",
  );
  TestValidator.equals("organization name", snapshot.name, organization.name);
  TestValidator.equals("currency", snapshot.currency, organization.currency);
  TestValidator.equals("timezone", snapshot.timezone, organization.timezone);
  TestValidator.equals(
    "fiscal_start_month",
    snapshot.fiscal_start_month,
    organization.fiscal_start_month,
  );
  // 7. Validate actor identity matches the registered member
  TestValidator.equals("actor id", snapshot.actor.id, authorized.id);
  TestValidator.equals("actor email", snapshot.actor.email, authorized.email);
  TestValidator.equals(
    "actor display_name",
    snapshot.actor.display_name,
    authorized.display_name,
  );
  // 8. Validate owner identity matches the organization's owner
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
  // 9. Validate all required fields are present and non-empty
  TestValidator.predicate(
    "snapshot id is present",
    typeof snapshot.id === "string",
  );
  TestValidator.predicate(
    "created_at is present",
    typeof snapshot.created_at === "string",
  );
  TestValidator.predicate(
    "description is present or null",
    snapshot.description === null || typeof snapshot.description === "string",
  );
  TestValidator.predicate(
    "event_details is present or null",
    snapshot.event_details === null ||
      typeof snapshot.event_details === "string",
  );
  TestValidator.predicate(
    "logo_uri is present or null",
    snapshot.logo_uri === null || typeof snapshot.logo_uri === "string",
  );
}
