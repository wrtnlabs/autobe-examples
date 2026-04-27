import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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
 * Test that a non-member receives 404 when retrieving an organization.
 *
 * Validates strict multi-tenant data isolation by creating an organization under Member A, then attempting to retrieve it using a different authenticated member (Member B) who does not belong to that organization. The system must reject the request with 404 Not Found, preventing unauthorized discovery of organization existence.
 *
 * Also performs a secondary validation that Member A (the owner) can still retrieve the same organization successfully, confirming the 404 was an access control rejection and not a deletion or data loss.
 *
 * 1. Register Member A via authorize_member_join with display_name "Bob".
 * 2. Member A creates a random organization via generate_random_hrm_time_tracking_member_organizations_create.
 * 3. Register Member B via authorize_member_join with display_name "Charlie".
 * 4. Member B attempts to GET the organization created by Member A — expects HTTP 404.
 * 5. Member A retrieves the same organization — expects 200 OK with valid organization data.
 */
export async function test_api_organization_retrieval_data_isolation_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (future organization owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: "Bob",
    },
  });
  // 2. Member A creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register Member B (outsider who does not belong to the organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      display_name: "Charlie",
    },
  });
  // 4. Member B tries to retrieve Member A's organization → 404
  await TestValidator.httpError(
    "non-member cannot discover organization",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.at(
        memberBConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
  // 5. Member A (owner) can still retrieve the organization → 200 OK
  const verified = await api.functional.hrmTimeTracking.member.organizations.at(
    memberAConnection,
    {
      organizationId: organization.id,
    },
  );
  typia.assert(verified);
}
