import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityMember";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Tests member listing with creation date range filtering using created_at_from and created_at_to parameters.
 *
 * Creates multiple member accounts with sequential creation timestamps and validates that the member listing endpoint correctly filters results by the specified date range. Verifies that members created within the range (inclusive) are returned while those created before the range are excluded.
 *
 * The BETWEEN filter logic applies >= comparison for created_at_from and <= comparison for created_at_to, ensuring inclusive boundary matching for both start and end dates. String-based ISO 8601 date comparison is used for efficient range validation.
 *
 * 1. Registers first member account and captures creation timestamp.
 * 2. Registers second member account with a later creation timestamp.
 * 3. Registers third member account with the latest creation timestamp.
 * 4. Queries member listing with created_at_from set to second member's timestamp and created_at_to set to third member's timestamp.
 * 5. Validates all returned members fall within the inclusive date range.
 * 6. Confirms first member (created before range) is excluded from results.
 * 7. Verifies second and third members (within range boundaries) are included.
 */
export async function test_api_member_listing_created_at_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and capture creation timestamp
  const member1Conn: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Conn, { body: {} });
  // 2. Register second member
  const member2Conn: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Conn, { body: {} });
  // 3. Register third member
  const member3Conn: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Conn, { body: {} });
  // 4. Query with date range filter - members created from member2 to member3
  const listConn: api.IConnection = { host: connection.host };
  const body = {
    created_at_from: member2.created_at,
    created_at_to: member3.created_at,
    limit: 100,
  } satisfies IREdditLikeCommunityMember.IRequest;
  const response = await api.functional.redditLikeCommunity.members.index(
    listConn,
    {
      body,
    },
  );
  typia.assert(response);
  // 5. Validate all returned members are within the inclusive date range
  TestValidator.predicate("all results within created_at date range", () =>
    response.data.every(
      (m) =>
        m.created_at >= member2.created_at &&
        m.created_at <= member3.created_at,
    ),
  );
  // 6. Verify members at boundaries are included (inclusive range)
  TestValidator.predicate("second member at range start is included", () =>
    response.data.some((m) => m.id === member2.id),
  );
  TestValidator.predicate("third member at range end is included", () =>
    response.data.some((m) => m.id === member3.id),
  );
  // 7. Verify member created before the range is excluded
  TestValidator.predicate(
    "member before range start is excluded",
    () => !response.data.some((m) => m.id === member1.id),
  );
}
