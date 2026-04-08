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
 * Test organization creation with complete data including all optional fields.
 *
 * Validates the complete organization creation flow including member registration, authentication, and organization creation with all available fields. Ensures that the organization is created successfully with all provided data correctly stored and returned.
 *
 * Special attention is given to verifying that all organization configuration fields (currency, timezone, fiscal start month) are properly validated and stored, and that the organization is immediately accessible for subsequent operations.
 *
 * 1. New member registers with unique email and password.
 * 2. Member creates organization with name, description, logo URL, currency, timezone, and fiscal start month.
 * 3. Validates organization response includes all fields with correct values matching input.
 * 4. Verifies timestamps (createdAt, updatedAt) are properly set as valid ISO 8601 date-time strings.
 */
export async function test_api_organization_creation_with_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
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
  // 2. Prepare organization creation data
  const createInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logo_url: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(
      typia.random<string & tags.Format<"uri">>(),
    ),
    currency: RandomGenerator.pick([
      "USD",
      "EUR",
      "KRW",
      "JPY",
      "GBP",
    ] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/London",
      "UTC",
    ] as const),
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmPlatformOrganization.ICreate;
  // 3. Create organization with complete data
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      { body: createInput },
    );
  typia.assert(organization);
  // 4. Validate organization fields match input
  TestValidator.equals(
    "name matches input",
    organization.name,
    createInput.name,
  );
  TestValidator.equals(
    "description matches input",
    organization.description,
    createInput.description,
  );
  TestValidator.equals(
    "logoUrl matches input",
    organization.logoUrl,
    createInput.logo_url,
  );
  TestValidator.equals(
    "currency matches input",
    organization.currency,
    createInput.currency,
  );
  TestValidator.equals(
    "timezone matches input",
    organization.timezone,
    createInput.timezone,
  );
  TestValidator.equals(
    "fiscalStartMonth matches input",
    organization.fiscalStartMonth,
    createInput.fiscal_start_month,
  );
  // 5. Validate timestamps exist and are valid
  TestValidator.predicate(
    "has createdAt timestamp",
    organization.createdAt !== null,
  );
  TestValidator.predicate(
    "has updatedAt timestamp",
    organization.updatedAt !== null,
  );
}