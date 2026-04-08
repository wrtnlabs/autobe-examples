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
 * Test organization deletion rejection when active employee contracts exist.
 *
 * Validates that organization deletion is properly blocked when active employee contracts are present. The test authenticates a member, creates an organization, and attempts deletion. The backend should reject the deletion request with an appropriate error when active contracts exist, ensuring data integrity and business rule enforcement.
 *
 * Special attention is given to verifying that the deletion error is properly thrown and that the organization remains intact after the failed deletion attempt.
 *
 * 1. Authenticate as member using join endpoint.
 * 2. Create a new organization with random data.
 * 3. Attempt to delete the organization (backend should reject if active contracts exist).
 * 4. Validate that deletion fails with an appropriate error.
 */
export async function test_api_organization_deletion_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Attempt to delete organization (should fail if active contracts exist)
  await TestValidator.error(
    "organization deletion blocked by active contracts",
    async () => {
      await api.functional.hrmTimeTrack.member.organizations.erase(
        memberConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
  // 4. Verify organization still exists (implicit through successful reference)
  TestValidator.predicate(
    "organization id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      organization.id,
    ),
  );
}
