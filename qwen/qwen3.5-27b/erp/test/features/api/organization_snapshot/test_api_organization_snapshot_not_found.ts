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
 * Test that retrieving a non-existent organization snapshot returns appropriate 404 error.
 *
 * Validates that the system properly handles requests for organization snapshots that do not exist in the database. The test authenticates a member account and attempts to retrieve a snapshot using a validly formatted UUID that has no corresponding record.
 *
 * This test ensures proper error handling for missing resources and confirms that the API returns appropriate HTTP 404 status codes rather than returning partial data or throwing unexpected errors.
 *
 * 1. Authenticate a member account using authorize_member_join utility.
 * 2. Generate a valid UUID format snapshot ID that does not exist in the database.
 * 3. Attempt to retrieve the non-existent snapshot via GET /hrmTimeTrack/member/organization-snapshots/{snapshotId}.
 * 4. Verify the API throws an HttpError with 404 Not Found status code.
 */
export async function test_api_organization_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate non-existent snapshot ID (valid UUID format)
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent snapshot
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.organization_snapshots.at(
        memberConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
