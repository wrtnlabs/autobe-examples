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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that attempting to retrieve a non-existent organization snapshot returns a 404 Not Found error.
 *
 * Validates that the API correctly rejects requests for snapshots that do not exist
 * within a valid organization, returning a 404 HTTP status code. This prevents information
 * leakage by returning the same error regardless of whether the snapshot exists.
 *
 * 1. Join as a new member via POST /auth/member/join using the authorize_member_join utility.
 * 2. Create a new organization via POST /hrmTimeTracking/member/organizations using the generate utility.
 * 3. Attempt to retrieve a snapshot using a valid UUID that does not correspond to any existing snapshot.
 * 4. Verify that the API returns a 404 Not Found error.
 */
export async function test_api_organization_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Generate a random UUID for a non-existent snapshot
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve a non-existent snapshot and expect 404
  await TestValidator.httpError(
    "non-existent organization snapshot",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.snapshots.at(
        memberConnection,
        {
          organizationId: organization.id,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
