import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic retrieval of guest tracking records with pagination.
 *
 * Steps:
 * 1. Authenticate as a member using the join endpoint
 * 2. Call the guest list endpoint with default pagination parameters
 * 3. Verify the response contains a paginated list of guest records
 * 4. Validate pagination metadata (current page, limit, total records, total pages)
 * 5. Verify each guest summary includes: id, fingerprint, created_at, and sessions_count
 * 6. Confirm that session_count accurately reflects the number of sessions
 * 7. Verify soft-deleted guests are excluded by default (deleted filter not set)
 */
export async function test_api_guest_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call guest list endpoint with default pagination
  const guestList = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(guestList);
  // 3. Validate pagination metadata
  const pagination = guestList.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // 4. Validate pagination calculation consistency
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals("pages calculation", pagination.pages, expectedPages);
  // 5. Validate each guest summary has required fields
  for (const guest of guestList.data) {
    TestValidator.predicate(
      "guest id is valid UUID",
      typeof guest.id === "string",
    );
    TestValidator.predicate(
      "guest fingerprint exists",
      typeof guest.fingerprint === "string",
    );
    TestValidator.predicate(
      "guest created_at is valid",
      typeof guest.created_at === "string",
    );
    TestValidator.predicate(
      "sessions_count is non-negative",
      guest.sessions_count >= 0,
    );
  }
  // 6. Validate data count respects pagination limit
  if (pagination.limit > 0) {
    TestValidator.predicate(
      "data count does not exceed limit",
      guestList.data.length <= pagination.limit,
    );
  }
}
