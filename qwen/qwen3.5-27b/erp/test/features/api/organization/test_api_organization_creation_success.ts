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
 * Test the primary success path for creating a new organization with all required and optional fields.
 *
 * Validates that an authenticated member can successfully create an organization entity that serves as the root container for multi-tenant HRM and time tracking data. The test verifies that system-generated fields are properly set, all provided configuration settings are stored correctly, and the complete organization entity is returned in the response.
 *
 * Special attention is given to ensuring the organization name is unique, currency and timezone values are valid, and the fiscal year configuration is within acceptable bounds. The test also confirms that optional fields like description and logo can be included without affecting the core creation flow.
 *
 * 1. Authenticate a new member account with email and password.
 * 2. Create an organization with required fields (name, currency, timezone, fiscal_start_month) and optional fields (description, logo).
 * 3. Validate that the response contains all expected fields with correct types.
 * 4. Verify system-generated fields (id, created_at, updated_at, deleted_at) are properly set.
 * 5. Confirm the organization settings match the input values.
 */
export async function test_api_organization_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Prepare organization creation data
  const inputName = RandomGenerator.paragraph({ sentences: 3 });
  const inputDescription = RandomGenerator.paragraph({ sentences: 5 });
  const inputLogo = typia.random<string & tags.Format<"uri">>();
  const inputCurrency = RandomGenerator.pick([
    "USD",
    "EUR",
    "KRW",
    "JPY",
    "GBP",
  ]);
  const inputTimezone = RandomGenerator.pick([
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
    "Asia/Tokyo",
    "America/Los_Angeles",
  ]);
  const inputFiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  // 3. Create organization with all fields
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: inputName,
          description: inputDescription,
          logo: inputLogo,
          currency: inputCurrency,
          timezone: inputTimezone,
          fiscal_start_month: inputFiscalStartMonth,
        },
      },
    );
  // 4. Validate response structure - typia.assert performs complete type validation
  typia.assert(organization);
  // 5. Verify system-generated fields exist
  TestValidator.predicate("id is present", organization.id !== undefined);
  TestValidator.predicate(
    "created_at is present",
    organization.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    organization.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active organization",
    organization.deleted_at === null,
  );
  // 6. Verify organization settings match input values
  TestValidator.equals("name matches input", organization.name, inputName);
  TestValidator.equals(
    "description matches input",
    organization.description,
    inputDescription,
  );
  TestValidator.equals("logo matches input", organization.logo, inputLogo);
  TestValidator.equals(
    "currency matches input",
    organization.currency,
    inputCurrency,
  );
  TestValidator.equals(
    "timezone matches input",
    organization.timezone,
    inputTimezone,
  );
  TestValidator.equals(
    "fiscal_start_month matches input",
    organization.fiscal_start_month,
    inputFiscalStartMonth,
  );
  // 7. Verify business constraints
  TestValidator.predicate(
    "currency is valid ISO code",
    ["USD", "EUR", "KRW", "JPY", "GBP"].includes(organization.currency),
  );
  TestValidator.predicate(
    "fiscal_start_month is between 1 and 12",
    organization.fiscal_start_month >= 1 &&
      organization.fiscal_start_month <= 12,
  );
  TestValidator.predicate(
    "timezone is valid IANA identifier",
    /^(America|Europe|Asia|Pacific|Africa|Australia)\/[A-Za-z_]+$/.test(
      organization.timezone,
    ),
  );
}
