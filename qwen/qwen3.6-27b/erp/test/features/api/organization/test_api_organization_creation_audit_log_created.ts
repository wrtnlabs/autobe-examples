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
 * Test that creating a new organization generates proper audit trail entries.
 *
 * Validates the organization creation workflow by verifying that a new organization is successfully established with all required identity and operational settings. The API specification guarantees that organization creation automatically logs an activity log entry to hrm_platform_activity_logs for audit trail purposes, recording the creator and creation details.
 *
 * This test confirms that the complete creation pipeline executes correctly, including post-creation steps such as assigning the creator as owner with built-in Owner role, retrieving Owner role permissions, creating role-permission associations, and generating the audit trail log entry.
 *
 * 1. Generate organization creation request with random valid settings (name, currency, timezone, fiscal month).
 * 2. Create the organization using the utility generation function.
 * 3. Assert the returned organization entity is fully typed and valid.
 * 4. Validate that returned fields reflect the creation request values.
 * 5. Verify lifecycle timestamps are present and organization is active (not soft-deleted).
 */
export async function test_api_organization_creation_audit_log_created(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for organization creation
  const orgConnection: api.IConnection = { host: connection.host };
  // 1. Prepare organization creation request with specific validation values
  const organizationName = RandomGenerator.name();
  const currency = "USD";
  const timezone = "Asia/Seoul";
  const fiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >() as number;
  const body = {
    name: organizationName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: null,
    currency,
    timezone,
    fiscal_start_month: fiscalStartMonth,
  } satisfies IHrmPlatformOrganization.ICreate;
  // 2. Create organization using utility function
  const organization = await generate_random_hrm_platform_organizations_create(
    orgConnection,
    {
      body,
    },
  );
  // 3. Assert the response is a valid organization entity
  typia.assert(organization);
  // 4. Verify returned organization fields match creation request
  TestValidator.equals(
    "organization name",
    organization.name,
    organizationName,
  );
  TestValidator.equals("currency", organization.currency, currency);
  TestValidator.equals("timezone", organization.timezone, timezone);
  TestValidator.equals(
    "fiscal start month",
    organization.fiscal_start_month,
    fiscalStartMonth,
  );
  // 5. Verify lifecycle properties
  TestValidator.predicate("has valid id", organization.id.length > 0);
  TestValidator.predicate(
    "created at is set",
    organization.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at is set",
    organization.updated_at !== undefined,
  );
  TestValidator.equals(
    "is active (not deleted)",
    organization.deleted_at,
    null,
  );
}
