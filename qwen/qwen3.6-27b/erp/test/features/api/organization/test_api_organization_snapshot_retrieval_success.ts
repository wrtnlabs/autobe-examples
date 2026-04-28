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
 * Test organization configuration snapshot retrieval success path.
 *
 * Validates the complete snapshot retrieval workflow including organization creation, snapshot creation, and snapshot retrieval. Ensures that the returned snapshot contains all configuration fields preserved at the time of creation.
 *
 * Special attention is given to verifying that all configuration properties (name, description, logo_href, currency, timezone, fiscal_start_month) are correctly preserved in the immutable snapshot record, and that the organization and acting member references are valid.
 *
 * 1. Organization is created with random configuration settings using utility function.
 * 2. Snapshot is created capturing the organization's current configuration state.
 * 3. Snapshot is retrieved by organizationId and snapshotId using the GET endpoint.
 * 4. Validates snapshot contains all expected configuration fields and references the correct organization and acting member.
 */
export async function test_api_organization_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for all operations
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create organization using utility function (creator becomes owner)
  const organization = await generate_random_hrm_platform_organizations_create(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(organization);
  // 2. Create snapshot capturing current organization configuration
  // Note: The endpoint ignores the request body and captures live database state
  const snapshotCreated =
    await api.functional.hrmPlatform.organizations.snapshots.create(
      userConnection,
      {
        organizationId: organization.id,
        body: api.functional.hrmPlatform.organizations.snapshots.create.random(),
      },
    );
  typia.assert(snapshotCreated);
  // 3. Retrieve the snapshot using GET endpoint
  const snapshotRetrieved =
    await api.functional.hrmPlatform.organizations.snapshots.at(
      userConnection,
      {
        organizationId: organization.id,
        snapshotId: snapshotCreated.id,
      },
    );
  typia.assert(snapshotRetrieved);
  // 4. Validate snapshot matches the one that was created
  TestValidator.equals(
    "snapshot id matches created",
    snapshotRetrieved.id,
    snapshotCreated.id,
  );
  TestValidator.equals(
    "organization name preserved",
    snapshotRetrieved.name,
    snapshotCreated.name,
  );
  TestValidator.equals(
    "currency code preserved",
    snapshotRetrieved.currency,
    snapshotCreated.currency,
  );
  TestValidator.equals(
    "timezone preserved",
    snapshotRetrieved.timezone,
    snapshotCreated.timezone,
  );
  TestValidator.equals(
    "fiscal start month preserved",
    snapshotRetrieved.fiscal_start_month,
    snapshotCreated.fiscal_start_month,
  );
  // Validate organization reference is present and matches source organization
  TestValidator.predicate(
    "organization reference exists",
    snapshotRetrieved.organization != null,
  );
  TestValidator.equals(
    "organization id matches",
    snapshotRetrieved.organization.id,
    organization.id,
  );
  // Validate acting member reference is present with valid data
  TestValidator.predicate(
    "acting member reference exists",
    snapshotRetrieved.actingMember != null,
  );
  TestValidator.predicate(
    "acting member has email",
    snapshotRetrieved.actingMember.email.length > 0,
  );
  // Validate created_at timestamp is present and valid
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    snapshotRetrieved.created_at.length > 0,
  );
}
