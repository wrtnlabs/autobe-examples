import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_user_bans_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with non-existent member_id
  const response1 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "empty data for non-existent member",
    response1.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent member",
    response1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent member",
    response1.pagination.pages,
    0,
  );
  TestValidator.equals("current page 1", response1.pagination.current, 1);
  TestValidator.equals("limit 10", response1.pagination.limit, 10);
  // Test 2: Filter by non-existent status
  const response2 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          status: "nonexistent_status",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("empty data for invalid status", response2.data, []);
  TestValidator.equals(
    "zero records for invalid status",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for invalid status",
    response2.pagination.pages,
    0,
  );
  // Test 3: Apply future date ranges where no bans occurred
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const response3 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          banned_at_from: futureDate,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("empty data for future dates", response3.data, []);
  TestValidator.equals(
    "zero records for future dates",
    response3.pagination.records,
    0,
  );
  // Test 4: Search for non-matching reason text
  const response4 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          reason: "completely_nonexistent_reason_text_that_will_never_match",
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "empty data for non-matching reason",
    response4.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-matching reason",
    response4.pagination.records,
    0,
  );
  TestValidator.equals("limit 1", response4.pagination.limit, 1);
  // Test 5: Pagination boundary - request page beyond available pages
  const response5 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response5);
  TestValidator.equals("empty data for high page number", response5.data, []);
  TestValidator.equals(
    "zero records for high page number",
    response5.pagination.records,
    0,
  );
  TestValidator.equals("current page 100", response5.pagination.current, 100);
  // Test 6: Minimum limit value
  const response6 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response6);
  TestValidator.equals("empty data for limit 1", response6.data, []);
  TestValidator.equals("limit 1", response6.pagination.limit, 1);
  // Test 7: Maximum limit value
  const response7 =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(response7);
  TestValidator.equals("empty data for limit 100", response7.data, []);
  TestValidator.equals("limit 100", response7.pagination.limit, 100);
}
