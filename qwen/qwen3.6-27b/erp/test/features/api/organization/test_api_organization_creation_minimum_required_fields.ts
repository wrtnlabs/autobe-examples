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
 * Test organization creation with only required fields provided.
 *
 * Validates that a new organization can be created when supplying only the mandatory fields (name, currency, timezone, fiscal_start_month) while omitting optional fields (description, logo_uri). Verifies that the system correctly stores all required field values, sets optional fields to NULL, and generates system-managed attributes including UUID, creation timestamp, and update timestamp.
 *
 * Special attention is given to confirming that null-valued optional fields are properly handled by the API and that the organization is immediately available as an active organizational context with deleted_at set to NULL.
 *
 * 1. Create organization with only required fields (name, currency, timezone, fiscal_start_month), omitting optional description and logo_uri.
 * 2. Validate that optional fields (description, logo_uri) are NULL in response.
 * 3. Verify all required field values match the input.
 * 4. Confirm system-generated fields (id, created_at, updated_at) are present.
 * 5. Assert organization is active with deleted_at NULL.
 */
export async function test_api_organization_creation_minimum_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for connection isolation
  const orgConnection: api.IConnection = { host: connection.host };
  // Prepare request body with only required fields
  const body = {
    name: RandomGenerator.name(),
    currency: "USD",
    timezone: "America/New_York",
    fiscal_start_month: 1,
  } satisfies IHrmPlatformOrganization.ICreate;
  // Create organization using utility function with partial body (optional fields omitted)
  const organization = await generate_random_hrm_platform_organizations_create(
    orgConnection,
    {
      body,
    },
  );
  // Validate complete response structure
  typia.assert(organization);
  // Verify optional fields are NULL when not provided
  TestValidator.equals(
    "description is null when omitted",
    organization.description,
    null,
  );
  TestValidator.equals(
    "logo_uri is null when omitted",
    organization.logo_uri,
    null,
  );
  // Verify required fields match input values
  TestValidator.equals("name matches input", organization.name, body.name);
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
  // Verify system-generated fields are present
  TestValidator.predicate("id is generated", organization.id !== "");
  TestValidator.predicate(
    "created_at is generated",
    organization.created_at !== "",
  );
  TestValidator.predicate(
    "updated_at is generated",
    organization.updated_at !== "",
  );
  // Verify organization is active (not soft-deleted)
  TestValidator.equals(
    "organization is active with deleted_at null",
    organization.deleted_at,
    null,
  );
}
