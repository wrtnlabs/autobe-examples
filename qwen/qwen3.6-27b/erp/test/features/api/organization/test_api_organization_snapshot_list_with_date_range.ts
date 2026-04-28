import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test retrieval of organization configuration snapshots with date range filtering.
 *
 * Validates that organization configuration snapshots can be retrieved and filtered by creation date range. Organization snapshots are immutable point-in-time records capturing the complete state of organizational settings when changes are made. The test verifies pagination metadata is correctly returned and that each snapshot contains the expected configuration fields including currency, timezone, fiscal year settings, and references to the acting member and organization.
 *
 * The date range filter uses ISO 8601 format with `created_from` (inclusive start) and `created_to` (inclusive end) parameters. Snapshots outside the specified range are excluded from results while pagination totals reflect the filtered count.
 *
 * 1. Organization is created, which auto-generates an initial configuration snapshot.
 * 2. Capture start timestamp before creation and end timestamp after creation.
 * 3. Query snapshots with narrow date range encompassing only the creation period.
 * 4. Query snapshots with wide date range to retrieve all snapshots.
 * 5. Verify pagination metadata correctly reflects filtered and unfiltered result sets.
 * 6. Validate snapshot structure includes all expected configuration fields.
 */
export async function test_api_organization_snapshot_list_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for organization operations
  const orgConnection: api.IConnection = { host: connection.host };
  // Capture start timestamp before organization creation for date range filter
  const startDate = new Date().toISOString();
  // 1. Create organization - this auto-generates an initial configuration snapshot
  const organization = await generate_random_hrm_platform_organizations_create(
    orgConnection,
    {
      body: undefined,
    },
  );
  typia.assert(organization);
  // Wait a brief moment to ensure snapshot is persisted and timestamps are distinct
  await new Promise((resolve) => setTimeout(() => resolve(undefined), 100));
  // Capture end timestamp after creation for date range filter
  const endDate = new Date().toISOString();
  // 2. Query snapshots with date range filter (created_from to created_to)
  const bodyWithDateRange: IHrmPlatformOrganizationSnapshot.IRequest = {
    created_from: startDate,
    created_to: endDate,
    page: 1,
    limit: 20,
  };
  const filteredSnapshots =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      orgConnection,
      {
        organizationId: organization.id,
        body: bodyWithDateRange,
      },
    );
  typia.assert(filteredSnapshots);
  // 3. Query snapshots without date range filter (all snapshots for this org)
  const bodyAllSnapshots: IHrmPlatformOrganizationSnapshot.IRequest = {
    page: 1,
    limit: 20,
  };
  const allSnapshots =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      orgConnection,
      {
        organizationId: organization.id,
        body: bodyAllSnapshots,
      },
    );
  typia.assert(allSnapshots);
  // 4. Validate filtered results match all results when range encompasses all snapshots
  TestValidator.equals(
    "filtered record count matches total when range covers all",
    filteredSnapshots.pagination.records,
    allSnapshots.pagination.records,
  );
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    filteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    filteredSnapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has snapshots",
    filteredSnapshots.pagination.records >= 1,
  );
  // 6. Validate snapshot structure - get first snapshot
  const snapshot = filteredSnapshots.data[0];
  typia.assert(snapshot);
  // Verify snapshot contains expected configuration fields
  TestValidator.equals(
    "snapshot name matches organization",
    snapshot.name,
    organization.name,
  );
  TestValidator.equals(
    "snapshot currency matches organization",
    snapshot.currency,
    organization.currency,
  );
  TestValidator.equals(
    "snapshot timezone matches organization",
    snapshot.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "snapshot fiscal start month matches organization",
    snapshot.fiscalStartMonth,
    organization.fiscal_start_month,
  );
  // Verify snapshot references
  TestValidator.predicate(
    "acting member has valid ID",
    snapshot.actingMember.id.length > 0,
  );
  TestValidator.equals(
    "snapshot organization id matches",
    snapshot.organization.id,
    organization.id,
  );
  // Verify snapshot has valid timestamp within expected range
  const snapshotDate = new Date(snapshot.createdAt).getTime();
  TestValidator.predicate(
    "snapshot created_at within date range",
    snapshotDate >= new Date(startDate).getTime() &&
      snapshotDate <= new Date(endDate).getTime() + 5000,
  );
  // 7. Test with narrow date range that excludes the snapshot (using epoch date before creation)
  const beforeCreation = "1970-01-01T00:00:00.000Z"; // UTC epoch start, guaranteed before org creation
  const beforeSnapshot =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      orgConnection,
      {
        organizationId: organization.id,
        body: {
          created_to: beforeCreation,
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(beforeSnapshot);
  TestValidator.equals(
    "no snapshots before organization creation",
    beforeSnapshot.pagination.records,
    0,
  );
}
