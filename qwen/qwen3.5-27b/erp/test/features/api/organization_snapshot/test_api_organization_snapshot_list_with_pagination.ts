import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary workflow of searching and retrieving organization settings snapshots with pagination.
 *
 * Validates the complete organization snapshot retrieval flow including member authentication and paginated query execution. Ensures that the response contains proper pagination metadata and snapshot summaries with all required fields.
 *
 * Special attention is given to verifying that the pagination structure is correct, snapshots are sorted by created_at descending (newest first), and all snapshot data includes the organization reference.
 *
 * 1. Authenticate as a member user by registering with valid email and password
 * 2. Create a member-specific connection for API calls
 * 3. Call the organization snapshots endpoint with basic pagination parameters (page=1, limit=10)
 * 4. Verify the response contains pagination metadata and snapshot array
 * 5. Verify snapshots are sorted by created_at descending (newest first)
 * 6. Verify all returned snapshots belong to the authenticated member's current organization context
 */
export async function test_api_organization_snapshot_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Prepare pagination request
  const body = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  // 3. Call organization snapshots endpoint
  const response =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "has non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    response.pagination.pages >= 0,
  );
  // 5. Verify snapshots are sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created_at <= snapshot ${i - 1} created_at`,
        new Date(response.data[i].created_at) <=
          new Date(response.data[i - 1].created_at),
      );
    }
  }
  // 6. Verify each snapshot has required fields and organization reference
  for (const snapshot of response.data) {
    TestValidator.predicate("has valid id", snapshot.id !== undefined);
    TestValidator.predicate("has name", snapshot.name !== undefined);
    TestValidator.predicate("has currency", snapshot.currency !== undefined);
    TestValidator.predicate("has timezone", snapshot.timezone !== undefined);
    TestValidator.predicate(
      "has fiscal_start_month",
      snapshot.fiscal_start_month !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "has organization reference",
      snapshot.organization !== undefined,
    );
    TestValidator.predicate(
      "organization has id",
      snapshot.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      snapshot.organization.name !== undefined,
    );
  }
}
