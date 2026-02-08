import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_sessions_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario 1: Successfully retrieve a paginated list of registered user sessions with basic pagination defaults.
   * 1. Administrator joins and logs in to obtain an admin connection.
   * 2. Call the PATCH /discussionBoard/registeredUser/sessions endpoint with empty filter to get default pagination.
   * 3. Validate the response structure and contents.
   *
   * Test scenario 2: Retrieve registered user sessions filtered by registered user ID and active status.
   * The DTO for request has no property definitions currently, so no filter criteria can be sent.
   * Therefore, we skip this filtering.
   *
   * Test scenario 3: Retrieve registered user sessions filtered by IP address and date range.
   * Same as above, no properties for filtering defined, so we skip precise filtering.
   */
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // Test scenario 1: No filters, default pagination
  const result1 =
    await api.functional.discussionBoard.registeredUser.sessions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "pagination info exists",
    result1.pagination !== undefined && result1.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page is number",
    typeof result1.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof result1.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof result1.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof result1.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(result1.data));
  // Note: Scenarios 2 and 3 cannot be implemented due to no schema properties for filtering
  // Thus, we do not attempt to filter by registeredUserId, status, ip, or dates
}
