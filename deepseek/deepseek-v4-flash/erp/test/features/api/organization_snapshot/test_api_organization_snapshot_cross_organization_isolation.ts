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

export async function test_api_organization_snapshot_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Organization A — generates a 'created' snapshot for Org A
  const organizationA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organizationA);
  // 3. Create Organization B — generates a 'created' snapshot for Org B
  const organizationB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organizationB);
  // 4. Query Organization A's snapshots
  const snapshotsA =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId: organizationA.id,
        body: {},
      },
    );
  typia.assert(snapshotsA);
  // 5. Verify only Organization A's snapshot records are returned
  TestValidator.equals(
    "org A snapshot count",
    snapshotsA.pagination.records,
    1,
  );
  TestValidator.predicate(
    "org A snapshot is 'created' event",
    () => snapshotsA.data[0]!.event_type === "created",
  );
  TestValidator.predicate(
    "org A snapshot has org A's name",
    () => snapshotsA.data[0]!.name === organizationA.name,
  );
  TestValidator.predicate("org A snapshot does NOT contain org B's name", () =>
    snapshotsA.data.every((s) => s.name !== organizationB.name),
  );
  // 6. Query Organization B's snapshots
  const snapshotsB =
    await api.functional.hrmTimeTracking.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId: organizationB.id,
        body: {},
      },
    );
  typia.assert(snapshotsB);
  // 7. Verify only Organization B's snapshot records are returned
  TestValidator.equals(
    "org B snapshot count",
    snapshotsB.pagination.records,
    1,
  );
  TestValidator.predicate(
    "org B snapshot is 'created' event",
    () => snapshotsB.data[0]!.event_type === "created",
  );
  TestValidator.predicate(
    "org B snapshot has org B's name",
    () => snapshotsB.data[0]!.name === organizationB.name,
  );
  TestValidator.predicate("org B snapshot does NOT contain org A's name", () =>
    snapshotsB.data.every((s) => s.name !== organizationA.name),
  );
}
