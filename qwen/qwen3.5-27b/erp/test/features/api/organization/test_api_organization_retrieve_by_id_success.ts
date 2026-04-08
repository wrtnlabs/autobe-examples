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
 * Test the primary success path for retrieving an organization by its unique identifier.
 *
 * Validates that a newly created organization can be successfully retrieved by its ID, ensuring all organization fields are correctly persisted and returned. The test verifies identity information, operational settings, fiscal configuration, and audit timestamps are intact.
 *
 * Special attention is given to verifying that the organization ID reference is correctly maintained and that the soft-delete status indicates an active organization.
 *
 * 1. Register a new member account with email and password authentication.
 * 2. Create a new organization with valid name, currency, timezone, and fiscal_start_month.
 * 3. Retrieve the organization by its unique identifier.
 * 4. Validate all organization fields match the created data.
 * 5. Verify deleted_at is null indicating an active organization.
 */
export async function test_api_organization_retrieve_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Retrieve organization by ID
  const retrieved = await api.functional.hrmTimeTrack.member.organizations.at(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate organization ID matches
  TestValidator.equals(
    "organization ID matches",
    retrieved.id,
    organization.id,
  );
  // 5. Validate identity fields
  TestValidator.equals("name matches", retrieved.name, organization.name);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    organization.description,
  );
  TestValidator.equals("logo matches", retrieved.logo, organization.logo);
  // 6. Validate operational settings
  TestValidator.equals(
    "currency matches",
    retrieved.currency,
    organization.currency,
  );
  TestValidator.equals(
    "timezone matches",
    retrieved.timezone,
    organization.timezone,
  );
  // 7. Validate fiscal configuration
  TestValidator.equals(
    "fiscal_start_month matches",
    retrieved.fiscal_start_month,
    organization.fiscal_start_month,
  );
  // 8. Validate audit timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
  // 9. Validate soft-delete status
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
