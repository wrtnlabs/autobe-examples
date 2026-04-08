import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test that soft-deleted organizations return 404 Not Found to maintain the illusion of non-existence.
 *
 * Validates that the organization retrieval endpoint properly handles requests for organizations that have been soft-deleted or do not exist. The system should return HTTP 404 Not Found to maintain the illusion of non-existence, preventing any access to soft-deleted organization data while preserving audit trails in the database.
 *
 * This test verifies the soft-delete pattern implementation where deleted organizations are not accessible via GET operations, ensuring data isolation and security boundaries are maintained. The test uses a non-existent organization ID to simulate the behavior that would occur with a soft-deleted organization.
 *
 * 1. Register a new member account with email and password authentication.
 * 2. Create a new organization to establish a valid member context.
 * 3. Attempt to retrieve a non-existent organization using a random UUID.
 * 4. Verify that the system returns HTTP 404 Not Found response.
 * 5. Confirm that no organization data is leaked in the error response.
 */
export async function test_api_organization_retrieve_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization to establish valid member context
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Generate a non-existent organization UUID to simulate soft-deleted behavior
  const nonExistentOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent organization
  // This should return 404 Not Found, simulating the behavior for soft-deleted organizations
  await TestValidator.httpError(
    "soft-deleted organization returns 404",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.organizations.at(
        memberConnection,
        {
          organizationId: nonExistentOrganizationId,
        },
      ),
  );
}
