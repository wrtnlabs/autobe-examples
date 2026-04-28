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
 * Test that only the organization owner can update organization settings.
 *
 * Validates the owner-only business rule for organization configuration updates.
 * Creates an organization via the primary connection (acting as the owner),
 * then attempts to modify its settings using a separate connection context
 * representing a different, non-owner member. Verifies that the unauthorized
 * update request is correctly rejected with a 403 Forbidden HTTP error,
 * ensuring organization settings remain secure and unmodified by non-owners.
 *
 * 1. Owner creates the target organization.
 * 2. Non-owner attempts to update the organization settings.
 * 3. System rejects the update with 403 Forbidden.
 * 4. Validates access control enforcement.
 */
export async function test_api_organization_update_by_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates the organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const organization = await generate_random_hrm_platform_organizations_create(
    ownerConnection,
    {},
  );
  typia.assert(organization);
  // 2. Non-owner attempts to update the organization
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  // 3. Validate that the update is denied with 403 Forbidden
  await TestValidator.httpError(
    "non-owner denied update access",
    403,
    async () => {
      await api.functional.hrmPlatform.organizations.update(
        nonOwnerConnection,
        {
          organizationId: organization.id,
          body: {
            name: "Unauthorized Update Attempt",
          } satisfies IHrmPlatformOrganization.IUpdate,
        },
      );
    },
  );
}
