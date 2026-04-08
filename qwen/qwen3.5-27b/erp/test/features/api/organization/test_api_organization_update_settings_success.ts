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
 * Test the primary success path for updating organization settings.
 *
 * Validates that an authenticated member can successfully update an organization's display name, description, logo URL, currency code, timezone, and fiscal start month. All changes take effect immediately and are reflected in the returned organization record. The updated_at timestamp should be updated to reflect the modification time.
 *
 * Special attention is given to verifying that all updatable fields are correctly modified and that system-generated timestamps (created_at remains unchanged, updated_at is refreshed) are properly maintained.
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Organization is created with initial settings.
 * 3. Organization settings are updated with new values for all fields.
 * 4. Response is validated to ensure all fields match the update request.
 * 5. Timestamps are verified to confirm update operation occurred.
 */
export async function test_api_organization_update_settings_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create initial organization
  const organization: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const originalCreatedAt: string = organization.created_at;
  const originalUpdatedAt: string = organization.updated_at;
  // 3. Prepare update body with new values
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo: typia.random<string & tags.Format<"uri">>(),
    currency: RandomGenerator.pick([
      "USD",
      "EUR",
      "KRW",
      "JPY",
      "GBP",
    ] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
    ] as const),
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmTimeTrackOrganization.IUpdate;
  // 4. Update organization
  const updatedOrganization: IHrmTimeTrackOrganization =
    await api.functional.hrmTimeTrack.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  // 5. Validate updated values match request
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo updated",
    updatedOrganization.logo,
    updateBody.logo,
  );
  TestValidator.equals(
    "currency updated",
    updatedOrganization.currency,
    updateBody.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrganization.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
  // 6. Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedOrganization.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedOrganization.updated_at,
    originalUpdatedAt,
  );
  // 7. Validate organization ID remains the same
  TestValidator.equals(
    "organization id unchanged",
    updatedOrganization.id,
    organization.id,
  );
  // 8. Validate organization is still active (not deleted)
  TestValidator.equals(
    "organization not deleted",
    updatedOrganization.deleted_at,
    null,
  );
}
