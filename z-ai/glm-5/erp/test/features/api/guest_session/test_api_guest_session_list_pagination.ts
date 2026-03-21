import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a paginated list of guest sessions as an authenticated member.
 *
 * This test validates that:
 * 1. Members can successfully retrieve guest session data with pagination
 * 2. Pagination metadata is correctly structured
 * 3. Each session record contains all required fields
 * 4. Guest information is properly included in each session
 */
export async function test_api_guest_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Call guest sessions endpoint with pagination parameters
  const request: IErpHrmGuestSession.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmGuestSession.IRequest;
  const response: IPageIErpHrmGuestSession.ISummary =
    await api.functional.erpHrm.member.guest_sessions.index(memberConnection, {
      body: request,
    });
  // Step 3: Validate response structure with typia.assert
  typia.assert(response);
  // Step 4: Verify pagination metadata matches request parameters
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 5: Verify pagination calculation correctness
  if (response.pagination.records > 0 && response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation is correct",
      response.pagination.pages,
      expectedPages,
    );
  }
}
