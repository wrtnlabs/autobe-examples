import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the edge case where a super administrator retrieves the pending requests queue when no pending requests exist.
 *
 * This test validates:
 * 1. Super administrator authentication via admin join
 * 2. Empty pending requests queue returns empty data array
 * 3. Pagination metadata correctly shows zero records and zero pages
 * 4. Endpoint handles empty result sets gracefully without errors
 */
export async function test_api_admin_request_pending_queue_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call pending requests endpoint without creating any requests
  // This ensures the queue is empty
  const result =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", result.data, []);
  // 4. Validate pagination metadata for empty result
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit matches request", result.pagination.limit, 20);
  TestValidator.equals("total records is zero", result.pagination.records, 0);
  TestValidator.equals("total pages is zero", result.pagination.pages, 0);
}
