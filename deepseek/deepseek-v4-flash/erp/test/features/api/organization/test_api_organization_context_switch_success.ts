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
 * Test organization context switch for an authenticated member belonging to multiple organizations.
 *
 * Validates that a member can successfully switch their active organization context from one
 * organization to another. The test registers a new member, creates two distinct organizations
 * (Alpha Corp and Beta Inc) with different configuration settings (currency, timezone), then
 * switches the active context to the second organization.
 *
 * The response is validated to confirm it returns the target organization with the correct
 * identifier, configured settings (EUR currency, Europe/Berlin timezone), and that the owner
 * reference matches the authenticated member.
 *
 * 1. Register a new member via authorize_member_join to obtain authenticated session.
 * 2. Create Organization A (Alpha Corp) with USD currency and America/New_York timezone.
 * 3. Create Organization B (Beta Inc) with EUR currency and Europe/Berlin timezone.
 * 4. Switch organization context to Organization B via switchOrganization endpoint.
 * 5. Validate the returned organization matches Organization B's properties and the owner matches the authenticated member.
 */
export async function test_api_organization_context_switch_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create Organization A (Alpha Corp)
  const orgA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Alpha Corp",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies DeepPartial<IHrmTimeTrackingOrganization.ICreate>,
      },
    );
  typia.assert(orgA);
  // 3. Create Organization B (Beta Inc)
  const orgB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Beta Inc",
          currency: "EUR",
          timezone: "Europe/Berlin",
          fiscal_start_month: 1,
        } satisfies DeepPartial<IHrmTimeTrackingOrganization.ICreate>,
      },
    );
  typia.assert(orgB);
  // 4. Switch organization context to Organization B
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: orgB.id,
      },
    );
  typia.assert(switched);
  // 5. Validate the response
  TestValidator.equals("organization id matches target", switched.id, orgB.id);
  TestValidator.equals("organization name", switched.name, "Beta Inc");
  TestValidator.equals("organization currency", switched.currency, "EUR");
  TestValidator.equals(
    "organization timezone",
    switched.timezone,
    "Europe/Berlin",
  );
  TestValidator.equals("fiscal start month", switched.fiscal_start_month, 1);
  TestValidator.equals(
    "owner id matches authenticated member",
    switched.owner.id,
    authorized.id,
  );
  TestValidator.equals("organization status", switched.status, "active");
}
