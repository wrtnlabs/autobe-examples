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
 * Test idempotent organization context switch when the member is already operating in the target organization.
 *
 * Validates that switching to the same organization the member is already acting within succeeds gracefully with a 200 OK response, confirming the idempotent behavior described in the API specification.
 *
 * 1. Registers a new member account to obtain authenticated API access.
 * 2. Creates an organization "Gamma Ltd" with GBP currency, Europe/London timezone, and April fiscal start.
 * 3. Calls switch-organization with the same organization's UUID — the member is the owner and already operating in this context.
 * 4. Validates that the response is a valid IHrmTimeTrackingOrganization with matching id, name, currency, and timezone.
 */
export async function test_api_organization_context_switch_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization with specific configuration
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Gamma Ltd",
          currency: "GBP",
          timezone: "Europe/London",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(organization);
  // 3. Switch to the same organization (idempotent switch)
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // 4. Validate the response matches the created organization
  TestValidator.equals("organization id matches", switched.id, organization.id);
  TestValidator.equals("organization name", switched.name, "Gamma Ltd");
  TestValidator.equals("organization currency", switched.currency, "GBP");
  TestValidator.equals(
    "organization timezone",
    switched.timezone,
    "Europe/London",
  );
  TestValidator.equals(
    "organization fiscal_start_month",
    switched.fiscal_start_month,
    4,
  );
}
