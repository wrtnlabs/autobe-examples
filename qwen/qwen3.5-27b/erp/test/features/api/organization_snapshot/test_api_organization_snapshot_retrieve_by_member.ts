import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve an organization snapshot from their organization.
 *
 * Validates the organization snapshot retrieval workflow for authenticated members. Ensures that members can access point-in-time snapshots of their organization's settings, including all configuration fields and the parent organization relation.
 *
 * The test verifies that the snapshot contains immutable organization settings captured at creation time, including name, description, logo URL, currency, timezone, fiscal start month, and creation timestamp. The organization relation provides essential context about the parent organization.
 *
 * 1. Register and authenticate a new member account using authorize_member_join utility.
 * 2. Generate a valid snapshot ID with UUID format for retrieval.
 * 3. Call the organization snapshot retrieval API with the generated snapshot ID.
 * 4. Validate the complete snapshot structure using typia.assert.
 * 5. Verify all required fields are present and correctly typed.
 * 6. Verify nullable fields (description, logo_url) are handled properly.
 * 7. Verify the organization relation contains IHrmTimeTrackOrganization.ISummary data.
 */
export async function test_api_organization_snapshot_retrieve_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate valid snapshot ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve organization snapshot
  const snapshot =
    await api.functional.hrmTimeTrack.member.organization_snapshots.at(
      memberConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has currency",
    snapshot.currency.length > 0,
  );
  TestValidator.predicate(
    "snapshot has timezone",
    snapshot.timezone.length > 0,
  );
  TestValidator.predicate(
    "fiscal start month is valid",
    snapshot.fiscal_start_month >= 1 && snapshot.fiscal_start_month <= 12,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
  // 5. Validate nullable fields
  TestValidator.predicate(
    "description is null or string",
    snapshot.description === null || typeof snapshot.description === "string",
  );
  TestValidator.predicate(
    "logo_url is null or valid URI",
    snapshot.logo_url === null || snapshot.logo_url.length > 0,
  );
  // 6. Validate organization relation
  TestValidator.predicate(
    "organization has id",
    snapshot.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    snapshot.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization has currency",
    snapshot.organization.currency.length > 0,
  );
  TestValidator.predicate(
    "organization has timezone",
    snapshot.organization.timezone.length > 0,
  );
  TestValidator.predicate(
    "organization fiscal month valid",
    snapshot.organization.fiscal_start_month >= 1 &&
      snapshot.organization.fiscal_start_month <= 12,
  );
  TestValidator.predicate(
    "organization has created_at",
    snapshot.organization.created_at.length > 0,
  );
}
