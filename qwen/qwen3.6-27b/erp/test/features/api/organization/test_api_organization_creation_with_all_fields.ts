import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test creating a new organization with all fields populated.
 *
 * Validates organization creation endpoint with complete request body including required identity attributes (name) and operational settings (currency, timezone, fiscal_start_month) plus optional fields (description, logo_uri). Verifies that the returned organization record contains all provided values, system-generated UUID identifier, system-managed timestamps, and null deleted_at indicating active state.
 *
 * 1. Create organization with all required and optional fields populated.
 * 2. Validate complete response structure with typia.assert.
 * 3. Verify all input fields are preserved in response.
 * 4. Verify system-generated fields (id, created_at, updated_at).
 * 5. Verify deleted_at is NULL for active organization.
 */
export async function test_api_organization_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create organization connection
  const orgConnection: api.IConnection = { host: connection.host };
  // Save body to reference validated return values
  const body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: `https://example.com/logos/${RandomGenerator.alphaNumeric(8)}.png`,
    currency: RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP"]),
    timezone: RandomGenerator.pick([
      "America/New_York",
      "Europe/London",
      "Asia/Seoul",
      "Pacific/Auckland",
      "America/Los_Angeles",
    ]),
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >() satisfies number as number,
  } satisfies IHrmPlatformOrganization.ICreate;
  // Generate organization with all fields populated
  const organization = await api.functional.hrmPlatform.organizations.create(
    orgConnection,
    {
      body,
    },
  );
  // Validate complete response structure
  typia.assert(organization);
  // Verify required fields match input values
  TestValidator.equals("name matches input", organization.name, body.name);
  TestValidator.equals(
    "description matches input",
    organization.description,
    body.description,
  );
  TestValidator.equals(
    "logo_uri matches input",
    organization.logo_uri,
    body.logo_uri,
  );
  TestValidator.equals(
    "currency matches input",
    organization.currency,
    body.currency,
  );
  TestValidator.equals(
    "timezone matches input",
    organization.timezone,
    body.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month matches input",
    organization.fiscal_start_month,
    body.fiscal_start_month,
  );
  // Verify system-generated fields
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      organization.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(organization.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(organization.updated_at),
  );
  TestValidator.equals("deleted_at is null", organization.deleted_at, null);
}
