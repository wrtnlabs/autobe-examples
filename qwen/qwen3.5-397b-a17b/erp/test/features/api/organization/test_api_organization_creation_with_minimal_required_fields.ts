import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test organization creation using only the mandatory required fields.
 *
 * Validates the complete organization creation flow with minimal input including member registration, authentication, and organization establishment with only required fields (name, currency, timezone, fiscal_start_month). Ensures that optional fields (description, logo_url) are truly optional and default to null when not provided.
 *
 * Special attention is given to verifying that the organization is created successfully with null values for optional fields, confirming the system correctly handles minimal valid input without requiring optional configuration data.
 *
 * 1. New member registers with email and password credentials.
 * 2. Member creates organization with only required fields (name, currency, timezone, fiscal_start_month).
 * 3. Validates organization is created with null description and logoUrl.
 * 4. Validates all required fields match input values.
 * 5. Validates organization has proper timestamps and UUID.
 */
export async function test_api_organization_creation_with_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization with minimal required fields only
  const organizationName = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          // Explicitly omit description and logo_url to test they are optional
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Validate required fields match input
  TestValidator.equals(
    "organization name",
    organization.name,
    organizationName,
  );
  TestValidator.equals("currency", organization.currency, "USD");
  TestValidator.equals("timezone", organization.timezone, "Asia/Seoul");
  TestValidator.equals("fiscal start month", organization.fiscalStartMonth, 1);
  // 4. Validate optional fields are null when not provided
  TestValidator.equals("description is null", organization.description, null);
  TestValidator.equals("logoUrl is null", organization.logoUrl, null);
}
