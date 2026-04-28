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
 * Validate GET returns 404 NOT FOUND when requested snapshotId does not exist.
 *
 * Verifies proper error handling when querying a snapshot record that was never created for an organization. The parent organization exists, but the specific snapshot identifier is invalid or was never created, confirming the endpoint gracefully handles missing snapshot records without returning partial data or internal errors.
 *
 * 1. Create a valid organization on the platform.
 * 2. Generate a random UUID that does not correspond to any existing snapshot.
 * 3. Attempt to retrieve the non-existent snapshot via the snapshots.at endpoint.
 * 4. Validate that the server responds with HTTP 404 NOT FOUND.
 */
export async function test_api_organization_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid organization
  const orgConnection: api.IConnection = { host: connection.host };
  const organization = await generate_random_hrm_platform_organizations_create(
    orgConnection,
    {},
  );
  typia.assert(organization);
  // 2. Generate a random UUID for non-existent snapshotId
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4. Attempt to retrieve and validate 404 response
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.hrmPlatform.organizations.snapshots.at(
        orgConnection,
        {
          organizationId: organization.id,
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
