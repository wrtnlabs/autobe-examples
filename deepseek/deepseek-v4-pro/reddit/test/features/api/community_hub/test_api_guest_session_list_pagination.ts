import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import type { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test pagination behavior of the guest session list endpoint.
 *
 * Verifies that the sessions listing endpoint returns correct page-based pagination metadata when retrieving session history with a specified page size. The test authenticates as a guest to establish at least one session record, then requests the session list with limit set to 1 to validate that pagination metadata fields are computed correctly.
 *
 * 1. Guest joins to create a session record.
 * 2. Sessions list is called with limit set to 1.
 * 3. Pagination metadata is validated: current defaults to 1, limit matches the request, records reflects the total count (at least 1), and pages equals the ceiling of records divided by limit.
 * 4. The data array length is confirmed not to exceed the requested limit.
 */
export async function test_api_guest_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to create a session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Call sessions list with page-based pagination (limit=1)
  const page = await api.functional.communityHub.guest.sessions.index(
    guestConnection,
    {
      body: {
        limit: 1,
      } satisfies ICommunityHubMemberSession.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("limit matches request", page.pagination.limit, 1);
  TestValidator.predicate(
    "records is at least 1",
    page.pagination.records >= 1,
  );
  TestValidator.equals(
    "pages is ceiling of records divided by limit",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
}
