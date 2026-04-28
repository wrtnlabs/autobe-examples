import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization configuration snapshot preserves null optional fields.
 *
 * Creates an organization without optional description and logo URI fields, captures a configuration snapshot, and retrieves it to verify that the snapshot explicitly preserves null values for optional fields rather than omitting them. Validates that required fields such as id, organization reference, actingMember reference, name, currency, timezone, fiscal_start_month, and created_at are present and correctly typed, while description and logo_href are confirmed to be null.
 *
 * This ensures snapshot immutability accurately reflects the oneOf nullable schema handling from the OpenAPI specification, maintaining historical accuracy for configuration auditing.
 *
 * 1. Create organization without optional description and logo URI fields.
 * 2. Create a configuration snapshot of the organization.
 * 3. Retrieve the snapshot by ID and validate response type.
 * 4. Verify optional fields are explicitly null (description, logo_href).
 * 5. Verify required fields are present and valid (id, name, currency, timezone, fiscal_start_month, created_at).
 * 6. Verify organization and actingMember references are correctly populated.
 */
export async function test_api_organization_snapshot_with_null_optional_fields(
  connection: api.IConnection,
) {
  // 1. Create organization connection for operations
  const organizationConnection: api.IConnection = { host: connection.host };
  // 2. Create organization without optional fields (description and logo_uri will be null)
  const organization = await generate_random_hrm_platform_organizations_create(
    organizationConnection,
    {
      body: {
        description: null,
        logo_uri: null,
      },
    },
  );
  typia.assert(organization);
  TestValidator.equals(
    "organization description is null",
    organization.description,
    null,
  );
  TestValidator.equals(
    "organization logo_uri is null",
    organization.logo_uri,
    null,
  );
  // 3. Create snapshot by calling the snapshots.create endpoint
  const snapshotCreateResponse: IHrmPlatformOrganizationSnapshot =
    await api.functional.hrmPlatform.organizations.snapshots.create(
      organizationConnection,
      {
        organizationId: organization.id,
        body: {} as IHrmPlatformOrganizationSnapshot,
      },
    );
  typia.assert(snapshotCreateResponse);
  // 4. Retrieve the snapshot using GET endpoint
  const snapshot: IHrmPlatformOrganizationSnapshot =
    await api.functional.hrmPlatform.organizations.snapshots.at(
      organizationConnection,
      {
        organizationId: organization.id,
        snapshotId: snapshotCreateResponse.id,
      },
    );
  typia.assert(snapshot);
  // 5. Validate null optional fields are preserved
  TestValidator.equals(
    "snapshot description is null",
    snapshot.description,
    null,
  );
  TestValidator.equals("snapshot logo_href is null", snapshot.logo_href, null);
  // 6. Validate required fields exist and match
  TestValidator.equals(
    "snapshot id is a valid UUID",
    typeof snapshot.id,
    "string",
  );
  TestValidator.equals(
    "snapshot id matches snapshot created",
    snapshot.id,
    snapshotCreateResponse.id,
  );
  TestValidator.equals(
    "snapshot name matches organization name",
    snapshot.name,
    organization.name,
  );
  TestValidator.equals(
    "snapshot currency matches organization currency",
    snapshot.currency,
    organization.currency,
  );
  TestValidator.equals(
    "snapshot timezone matches organization timezone",
    snapshot.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "snapshot fiscal_start_month is within valid range 1-12",
    snapshot.fiscal_start_month >= 1 && snapshot.fiscal_start_month <= 12,
    true,
  );
  TestValidator.equals(
    "snapshot created_at is a valid datetime string",
    typeof snapshot.created_at === "string" &&
      snapshot.created_at.includes("T"),
    true,
  );
  // 7. Validate organization reference in snapshot
  TestValidator.equals(
    "snapshot organization reference exists",
    snapshot.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "snapshot organization name matches",
    snapshot.organization.name,
    organization.name,
  );
  // 8. Validate actingMember reference exists
  TestValidator.equals(
    "snapshot actingMember id is a valid UUID",
    typeof snapshot.actingMember.id,
    "string",
  );
  TestValidator.equals(
    "snapshot actingMember display_name is present",
    typeof snapshot.actingMember.display_name,
    "string",
  );
  TestValidator.equals(
    "snapshot actingMember email is present",
    typeof snapshot.actingMember.email,
    "string",
  );
}