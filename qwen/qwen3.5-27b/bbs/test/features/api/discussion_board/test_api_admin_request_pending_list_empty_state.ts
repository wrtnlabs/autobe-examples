import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that a super administrator receives an empty but properly formatted response when no pending administrator requests exist.
 */
export async function test_api_admin_request_pending_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(authResponse);
  // 2. Call the pending admin requests endpoint
  const response =
    await api.functional.discussionBoard.administrator.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify the response structure
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1,
  );
}
