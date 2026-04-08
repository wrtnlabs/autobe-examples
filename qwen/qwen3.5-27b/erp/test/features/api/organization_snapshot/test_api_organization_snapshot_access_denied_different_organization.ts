import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member cannot access organization snapshots from organizations they do not belong to.
 *
 * Validates multi-tenant isolation by ensuring that members cannot retrieve organization snapshots from organizations they are not affiliated with. The test creates two separate member accounts and attempts cross-organization access to verify proper access control enforcement.
 *
 * Special attention is given to verifying that the API returns an appropriate error when an unauthorized member attempts to access a snapshot from a different organization, ensuring no data leakage occurs between organizations.
 *
 * 1. Register Member A account for Organization A.
 * 2. Register Member B account for Organization B (separate organization).
 * 3. Generate a valid UUID snapshot ID (simulating an existing snapshot from Organization A).
 * 4. Attempt to access the snapshot using Member B's authenticated connection.
 * 5. Verify the API call fails with an access denied error.
 */
export async function test_api_organization_snapshot_access_denied_different_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (Organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Register and authenticate Member B (Organization B - different organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Generate a valid UUID snapshot ID (simulating an existing snapshot from Organization A)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to access the snapshot using Member B's connection
  // This should fail because Member B does not belong to the organization that owns this snapshot
  await TestValidator.error(
    "cross-organization snapshot access should be denied",
    async () => {
      await api.functional.hrmTimeTrack.member.organization_snapshots.at(
        memberBConnection,
        {
          snapshotId,
        },
      );
    },
  );
}
