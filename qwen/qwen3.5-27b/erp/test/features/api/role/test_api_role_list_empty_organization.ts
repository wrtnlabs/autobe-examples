import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the edge case where role listing returns an empty result set.
 *
 * Validates that the role listing endpoint correctly handles scenarios where no roles match the search criteria. This test ensures the API returns a valid paginated response structure with empty data array and correct pagination metadata when no roles are found, rather than throwing an error or returning an invalid response.
 *
 * The test authenticates a member, then queries roles using a search filter that guarantees no matches (a unique non-existent role name). It verifies that the response maintains the correct structure with an empty data array and pagination metadata reflecting zero records.
 *
 * 1. Authenticate as a member using the member join utility function
 * 2. Create a member-specific connection for authenticated API calls
 * 3. Call the role listing endpoint with a unique role name filter that matches no roles
 * 4. Validate the response structure using typia.assert
 * 5. Verify the data array is empty
 * 6. Verify pagination metadata shows records: 0, pages: 0, current: 1
 * 7. Ensure no errors are thrown for empty result sets
 */
export async function test_api_role_list_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a unique role name that doesn't exist to ensure no matches
  const uniqueRoleName = `non_existent_role_${RandomGenerator.alphaNumeric(16)}`;
  // 3. Call role listing with a filter that matches no roles
  const response = await api.functional.hrmTimeTrack.member.roles.index(
    memberConnection,
    {
      body: {
        name: uniqueRoleName,
      } satisfies IHrmTimeTrackRole.IRequest,
    },
  );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Verify data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 6. Verify pagination metadata
  TestValidator.equals("records is 0", response.pagination.records, 0);
  TestValidator.equals("pages is 0", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
}
