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
 * Test organization name uniqueness enforcement during update operations.
 *
 * Tests that organization name uniqueness is enforced across the entire platform when updating an organization.
 * Two separate organizations are created with distinct names ('Org Alpha' and 'Org Beta').
 * An attempt to update 'Org Alpha's name to 'Org Beta' should fail due to the platform-wide
 * uniqueness constraint on organization names.
 *
 * 1. Create first organization with unique name 'Org Alpha'.
 * 2. Create second organization with unique name 'Org Beta'.
 * 3. Attempt to update 'Org Alpha's name to 'Org Beta'.
 * 4. Verify the update fails with a conflict error (409).
 * 5. Verify 'Org Alpha' retains its original name.
 */
export async function test_api_organization_update_name_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first organization with unique name 'Org Alpha'
  const orgAlpha = await generate_random_hrm_platform_organizations_create(
    connection,
    {
      body: {
        name: "Org Alpha",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1 satisfies number,
      },
    },
  );
  typia.assert(orgAlpha);
  // 2. Create second organization with unique name 'Org Beta'
  const orgBeta = await generate_random_hrm_platform_organizations_create(
    connection,
    {
      body: {
        name: "Org Beta",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1 satisfies number,
      },
    },
  );
  typia.assert(orgBeta);
  // 3-4. Attempt to update 'Org Alpha's name to 'Org Beta' and verify it fails
  await TestValidator.error(
    "organization name uniqueness conflict",
    async () => {
      await api.functional.hrmPlatform.organizations.update(connection, {
        organizationId: orgAlpha.id,
        body: {
          name: "Org Beta",
        } satisfies IHrmPlatformOrganization.IUpdate,
      });
    },
  );
  // 5. Verify 'Org Alpha' still has its original name
  TestValidator.equals(
    "Org Alpha retains original name",
    orgAlpha.name,
    "Org Alpha",
  );
}
