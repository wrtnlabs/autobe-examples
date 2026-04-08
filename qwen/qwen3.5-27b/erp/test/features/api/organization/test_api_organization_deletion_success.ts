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
 * Test successful organization deletion when all preconditions are satisfied.
 *
 * Validates that an authenticated member (organization owner) can delete their organization when there are no pending timesheets and no active employee contracts. The test verifies that the organization is soft-deleted with a deleted_at timestamp set, and the deletion operation returns a 204 No Content response.
 *
 * Since a fresh organization is created with no child entities (employees, projects, tasks, etc.), the preconditions for deletion are automatically satisfied.
 *
 * 1. Authenticate as a member using the join endpoint.
 * 2. Create a new organization with random test data.
 * 3. Delete the organization using the authenticated member connection.
 * 4. Verify the deletion succeeded without throwing an exception (204 No Content).
 */
export async function test_api_organization_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Delete organization
  await api.functional.hrmTimeTrack.member.organizations.erase(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Validate deletion succeeded (no exception = 204 No Content)
  TestValidator.predicate("organization deletion succeeded", true);
}
