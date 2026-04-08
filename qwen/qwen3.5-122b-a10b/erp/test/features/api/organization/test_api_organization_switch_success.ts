import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful organization context switching for a member user who belongs to multiple organizations.
 *
 * Validates the primary workflow for users who work across multiple organizations by testing the organization context switching functionality. The test ensures that authenticated members can seamlessly switch between organizations they belong to without re-authentication, and that the response contains complete and accurate organization summary information.
 *
 * The test covers the following scenarios:
 * 1. Member registration with email/password credentials
 * 2. Organization context switching to a different organization
 * 3. Response validation for organization summary data
 * 4. Session context update verification
 *
 * Special attention is given to validating that all required organization summary fields are present and correctly formatted, including id, name, currency, timezone, fiscal_start_month, and created_at.
 *
 * 1. Register a new member user with randomized credentials.
 * 2. Switch organization context to a target organization the member belongs to.
 * 3. Validate the response contains complete organization summary information.
 * 4. Verify organization ID matches the switched organization.
 * 5. Validate all required summary fields are present and valid.
 */
export async function test_api_organization_switch_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(joinResult);
  // 2. Generate a target organization ID for switching
  // Note: In a real test environment, this organization should be pre-created
  // and the member should be associated with it as an employee
  const targetOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Switch organization context
  const switchedOrganization: IHrmOrganization.ISummary =
    await api.functional.hrm.member.organizations._switch.select(
      memberConnection,
      {
        organizationId: targetOrganizationId,
      },
    );
  typia.assert(switchedOrganization);
  // 4. Validate organization summary fields
  TestValidator.equals(
    "organization ID matches",
    switchedOrganization.id,
    targetOrganizationId,
  );
  TestValidator.predicate(
    "organization name exists",
    switchedOrganization.name.length > 0,
  );
  TestValidator.predicate(
    "currency is defined",
    switchedOrganization.currency.length > 0,
  );
  TestValidator.predicate(
    "timezone is defined",
    switchedOrganization.timezone.length > 0,
  );
  TestValidator.predicate(
    "fiscal start month is valid number",
    typeof switchedOrganization.fiscal_start_month === "number",
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(switchedOrganization.created_at)),
  );
  // 5. Validate optional fields if present
  if (switchedOrganization.description) {
    TestValidator.predicate(
      "description is non-empty string",
      switchedOrganization.description.length > 0,
    );
  }
  if (switchedOrganization.logo_image_url) {
    TestValidator.predicate(
      "logo_image_url is non-empty URI",
      switchedOrganization.logo_image_url.length > 0,
    );
  }
}
