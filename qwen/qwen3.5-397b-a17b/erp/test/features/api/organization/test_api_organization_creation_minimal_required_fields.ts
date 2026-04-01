import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization creation with only the minimum required fields.
 *
 * A member creates an organization providing only name, currency, timezone,
 * and fiscal_start_month without optional description and logo fields.
 * Validate that the organization is created successfully with null values
 * for description and logo, confirming these fields are truly optional.
 * Verify the response contains all required fields populated correctly
 * and the organization is immediately usable. This tests the business rule
 * that organizations can be created with minimal configuration and
 * expanded later.
 */
export async function test_api_organization_creation_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account for organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization with only required fields (no description, no logo)
  const organizationBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    currency: "USD",
    timezone: "America/New_York",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmPlatformOrganization.ICreate;
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      { body: organizationBody },
    );
  typia.assert(organization);
  // 3. Validate required fields are populated correctly
  TestValidator.equals(
    "organization name matches",
    organization.name,
    organizationBody.name,
  );
  TestValidator.equals(
    "currency matches",
    organization.currency,
    organizationBody.currency,
  );
  TestValidator.equals(
    "timezone matches",
    organization.timezone,
    organizationBody.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month matches",
    organization.fiscal_start_month,
    organizationBody.fiscal_start_month,
  );
  // 4. Validate optional fields are null/undefined (confirming they are truly optional)
  TestValidator.predicate(
    "description is null or undefined",
    organization.description === null || organization.description === undefined,
  );
  TestValidator.predicate(
    "logo is null or undefined",
    organization.logo === null || organization.logo === undefined,
  );
  // 5. Validate organization is active (not soft-deleted)
  TestValidator.equals(
    "deleted_at is null (active organization)",
    organization.deleted_at,
    null,
  );
}
