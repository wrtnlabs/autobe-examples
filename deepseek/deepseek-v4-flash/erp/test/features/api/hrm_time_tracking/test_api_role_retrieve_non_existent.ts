import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
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
 * Test retrieving a role that does not exist within the organization.
 *
 * Validates the system's handling of requests for roles that don't exist,
 * have been soft-deleted, or belong to a different organization. The server
 * must return a 404 Not Found HTTP error for such requests, ensuring proper
 * multi-tenant data isolation and error reporting.
 *
 * 1. Register a new member via the join endpoint and authenticate.
 * 2. Create an organization to establish the tenant context.
 * 3. Generate a random UUID that does not correspond to any existing role.
 * 4. Attempt to retrieve the role and verify a 404 Not Found error is returned.
 */
export async function test_api_role_retrieve_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (this updates memberConnection with auth tokens)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Generate a non-existent role UUID
  const nonExistentRoleId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent role — expect 404
  await TestValidator.httpError(
    "retrieve non-existent role returns 404",
    404,
    async () =>
      await api.functional.hrmTimeTracking.member.organizations.roles.at(
        memberConnection,
        {
          organizationId: organization.id,
          roleId: nonExistentRoleId,
        },
      ),
  );
}
