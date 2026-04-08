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
 * Test organization snapshots endpoint returns empty results for new member.
 *
 * Validates that the organization snapshots endpoint correctly handles the case where no historical snapshots exist for the authenticated member's organization. The test verifies that empty results are returned as a successful response with proper pagination metadata rather than an error.
 *
 * Special attention is given to ensuring that the response structure is valid even when the data array is empty, and that pagination metadata correctly reflects zero records across zero pages.
 *
 * 1. Authenticate as a new member by registering with valid email and password.
 * 2. Call the organization snapshots endpoint with default pagination (no filters).
 * 3. Verify the response contains an empty data array.
 * 4. Verify pagination metadata shows records=0, pages=0, current=1.
 * 5. Verify the endpoint returns success (not error) for empty results.
 */
export async function test_api_organization_snapshot_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Call organization snapshots endpoint with default pagination
  const response =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Verify pagination metadata
  TestValidator.equals("records is 0", response.pagination.records, 0);
  TestValidator.equals("pages is 0", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
}
