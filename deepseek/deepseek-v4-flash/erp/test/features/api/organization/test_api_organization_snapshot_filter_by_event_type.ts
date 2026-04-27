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

export async function test_api_organization_snapshot_filter_by_event_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization - generates a 'created' snapshot
  const originalName = RandomGenerator.name();
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
        },
      },
    );
  typia.assert(organization);
  // 3. Update the organization's settings - triggers a 'settings_updated' snapshot
  const updatedName = `Updated ${originalName}`;
  const updatedDescription = `Updated: ${originalDescription}`;
  const updatedOrganization =
    await api.functional.hrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        },
      },
    );
  typia.assert(updatedOrganization);
  // 4. Filter snapshots by event_type='settings_updated'
  const settingsUpdatedPage =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          event_type: "settings_updated",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(settingsUpdatedPage);
  // 5. Verify exactly 1 snapshot with event_type='settings_updated'
  TestValidator.equals(
    "settings_updated snapshot count",
    settingsUpdatedPage.data.length,
    1,
  );
  TestValidator.equals(
    "settings_updated pagination records",
    settingsUpdatedPage.pagination.records,
    1,
  );
  const settingsUpdatedSnapshot = settingsUpdatedPage.data[0];
  TestValidator.equals(
    "settings_updated event_type",
    settingsUpdatedSnapshot.event_type,
    "settings_updated",
  );
  // 6. Verify snapshot denormalized attributes reflect updated values
  TestValidator.equals(
    "settings_updated name matches updated",
    settingsUpdatedSnapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "settings_updated description matches updated",
    settingsUpdatedSnapshot.description,
    updatedDescription,
  );
  // 7. Filter snapshots by event_type='created'
  const createdPage =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          event_type: "created",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(createdPage);
  // 8. Verify exactly 1 snapshot with event_type='created'
  TestValidator.equals("created snapshot count", createdPage.data.length, 1);
  TestValidator.equals(
    "created pagination records",
    createdPage.pagination.records,
    1,
  );
  const createdSnapshot = createdPage.data[0];
  TestValidator.equals(
    "created event_type",
    createdSnapshot.event_type,
    "created",
  );
  // 9. Verify snapshot denormalized attributes reflect original (pre-update) values
  TestValidator.equals(
    "created name matches original",
    createdSnapshot.name,
    originalName,
  );
  TestValidator.equals(
    "created description matches original",
    createdSnapshot.description,
    originalDescription,
  );
  // 10. Verify pagination metadata is correct for each filtered request
  TestValidator.equals(
    "settings_updated page current",
    settingsUpdatedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "settings_updated page pages",
    settingsUpdatedPage.pagination.pages,
    1,
  );
  TestValidator.equals(
    "created page current",
    createdPage.pagination.current,
    1,
  );
  TestValidator.equals("created page pages", createdPage.pagination.pages, 1);
}
