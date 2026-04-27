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
 * Test the successful creation of a new organization by an authenticated member.
 *
 * Validates the complete organization creation workflow including member registration, authentication, and organization creation. Ensures that the created organization's attributes match the input values exactly, the authenticated member is correctly assigned as the owner with owner.id matching the registered member id, and the organization status is "active".
 *
 * 1. Register a new member account with email, password, and display name using the authorize_member_join utility.
 * 2. Create a new organization with explicit name, currency, timezone, fiscal start month, and description via the generate_random_hrm_time_tracking_member_organizations_create utility.
 * 3. Validate the response structure with typia.assert for complete type conformance.
 * 4. Verify business logic: name, currency, timezone, fiscal_start_month, description match input; status is "active"; owner.id matches the registered member id.
 */
export async function test_api_organization_creation_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization with explicit input values for validation
  const organizationInput = {
    name: RandomGenerator.name(),
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
    description: "E2E test organization",
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      { body: organizationInput },
    );
  typia.assert(organization);
  // 3. Validate business logic
  TestValidator.equals(
    "organization name matches input",
    organization.name,
    organizationInput.name,
  );
  TestValidator.equals(
    "organization currency matches input",
    organization.currency,
    organizationInput.currency,
  );
  TestValidator.equals(
    "organization timezone matches input",
    organization.timezone,
    organizationInput.timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month matches input",
    organization.fiscal_start_month,
    organizationInput.fiscal_start_month,
  );
  TestValidator.equals(
    "organization description matches input",
    organization.description,
    organizationInput.description,
  );
  TestValidator.equals(
    "organization status is active",
    organization.status,
    "active",
  );
  TestValidator.equals(
    "organization owner id matches registered member id",
    organization.owner.id,
    member.id,
  );
}
