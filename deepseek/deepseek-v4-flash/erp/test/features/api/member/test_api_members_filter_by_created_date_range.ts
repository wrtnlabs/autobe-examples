import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering members by creation date range.
 *
 * Validates the PATCH /hrmTimeTracking/members endpoint's ability to filter member accounts based on their creation timestamp. Verifies that the date range filtering works correctly with inclusive boundaries at both ends, that a future date range returns zero results, and that combined search text with date range filtering uses AND logic.
 *
 * 1. Register two member accounts sequentially with distinct display names so their created_at timestamps differ.
 * 2. Call PATCH /hrmTimeTracking/members with from_created_at and to_created_at covering both members — expects 2 records.
 * 3. Narrow the range to include only the first member's created_at — expects 1 record.
 * 4. Set from_created_at to a future date — expects 0 records (empty data array).
 * 5. Use combined search text AND date range together — expects the record matching BOTH criteria.
 */
export async function test_api_members_filter_by_created_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register two members sequentially with distinct display names
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      display_name: `Alice_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member1);
  // Brief delay so created_at timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      display_name: `Bob_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member2);
  // Step 2: Filter by date range covering both members
  const bothMembers = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        from_created_at: member1.created_at,
        to_created_at: member2.created_at,
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(bothMembers);
  TestValidator.equals("both members in range", bothMembers.data.length, 2);
  // Step 3: Narrow range to include only the first member
  const firstMemberOnly = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        from_created_at: member1.created_at,
        to_created_at: member1.created_at,
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(firstMemberOnly);
  TestValidator.equals("only first member", firstMemberOnly.data.length, 1);
  // Step 4: Future date — should return empty data array
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const emptyResult = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        from_created_at: futureDate.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results for future date",
    emptyResult.data.length,
    0,
  );
  // Step 5: Combined search text + date range (AND logic)
  // Search for "Alice" should match member1's display_name but NOT member2's
  const searchAndDate = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        search: "Alice",
        from_created_at: member1.created_at,
        to_created_at: member2.created_at,
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(searchAndDate);
  TestValidator.equals(
    "combined filter returns Alice only",
    searchAndDate.data.length,
    1,
  );
}
