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
 * Test organization creation with all optional fields provided to verify complete configuration capabilities.
 *
 * Validates the complete organization creation flow including member authentication and organization setup with both required and optional fields. Ensures that the organization is created successfully with description and logo URL, and that all required fields are properly validated and stored.
 *
 * Special attention is given to verifying that optional fields (description, logo) are correctly handled and stored, and that system-generated fields (id, created_at, updated_at, deleted_at) are properly set by the backend.
 *
 * 1. Member registers with email and password authentication.
 * 2. Member creates an organization with all required fields (name, currency, timezone, fiscal_start_month) and optional fields (description, logo).
 * 3. Validates organization details match input and system-generated fields are correctly set.
 */
export async function test_api_organization_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Prepare organization creation data with all optional fields
  const inputName = RandomGenerator.paragraph({ sentences: 2 });
  const inputDescription = RandomGenerator.paragraph({ sentences: 3 });
  const inputLogo = typia.random<string & tags.Format<"uri">>();
  const inputCurrency = RandomGenerator.pick([
    "USD",
    "EUR",
    "KRW",
    "JPY",
    "GBP",
  ] as const);
  const inputTimezone = RandomGenerator.pick([
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
    "Asia/Tokyo",
  ] as const);
  const inputFiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  // 3. Create organization with all optional fields
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
  typia.assert(organization);
  // 4. Validate organization details match input
  TestValidator.equals(
    "organization name matches input",
    organization.name,
    inputName,
  );
  TestValidator.equals(
    "description is stored correctly",
    organization.description,
    inputDescription,
  );
  TestValidator.equals(
    "logo is stored correctly",
    organization.logo,
    inputLogo,
  );
  TestValidator.equals(
    "currency is stored correctly",
    organization.currency,
    inputCurrency,
  );
  TestValidator.equals(
    "timezone is stored correctly",
    organization.timezone,
    inputTimezone,
  );
  TestValidator.equals(
    "fiscal_start_month is stored correctly",
    organization.fiscal_start_month,
    inputFiscalStartMonth,
  );
  TestValidator.predicate(
    "organization has valid ID",
    organization.id.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active organization",
    organization.deleted_at,
    null,
  );
}
