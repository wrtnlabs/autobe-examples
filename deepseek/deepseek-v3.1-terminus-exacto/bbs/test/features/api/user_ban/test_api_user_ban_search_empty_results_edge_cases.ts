import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases for ban search operation including scenarios with no matching records,
 * invalid filter combinations, and boundary conditions.
 */
export async function test_api_user_ban_search_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test empty results with non-existent member_id
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyByMember =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          member_id: nonExistentMemberId,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyByMember);
  TestValidator.equals(
    "empty result for non-existent member",
    emptyByMember.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for non-existent member",
    emptyByMember.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for non-existent member",
    emptyByMember.pagination.pages,
    0,
  );
  // 3. Test empty results with non-existent admin_id
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const emptyByAdmin =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          admin_id: nonExistentAdminId,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyByAdmin);
  TestValidator.equals(
    "empty result for non-existent admin",
    emptyByAdmin.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for non-existent admin",
    emptyByAdmin.pagination.records,
    0,
  );
  // 4. Test empty results with non-matching reason text
  const nonMatchingReason = RandomGenerator.paragraph({ sentences: 2 });
  const emptyByReason =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          reason: nonMatchingReason,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyByReason);
  TestValidator.equals(
    "empty result for non-matching reason",
    emptyByReason.data.length,
    0,
  );
  // 5. Test empty results with future date ranges
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptyByFutureDate =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banned_at_from: futureDate,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyByFutureDate);
  TestValidator.equals(
    "empty result for future date range",
    emptyByFutureDate.data.length,
    0,
  );
  // 6. Test pagination edge cases with reasonable high page number
  const highPageResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          page: 100, // Reasonable high page number
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(highPageResult);
  TestValidator.predicate(
    "high page should have empty or valid data",
    highPageResult.data.length === 0 || highPageResult.pagination.current > 0,
  );
  // 7. Test boundary limit values
  const maxLimitResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResult.pagination.limit,
    100,
  );
  // 8. Test minimum limit value
  const minLimitResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitResult.pagination.limit,
    1,
  );
  // 9. Test null filter values (should disable filters)
  const nullFilterResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          member_id: null,
          admin_id: null,
          status: null,
          reason: null,
          banned_at_from: null,
          banned_at_to: null,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(nullFilterResult);
  TestValidator.predicate(
    "null filters should return valid response",
    nullFilterResult.pagination.records >= 0,
  );
  // 10. Test empty search criteria (should return all bans if any exist)
  const emptyCriteriaResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyCriteriaResult);
  TestValidator.predicate(
    "empty criteria should return valid pagination",
    emptyCriteriaResult.pagination.records >= 0 &&
      emptyCriteriaResult.pagination.current >= 0 &&
      emptyCriteriaResult.pagination.limit > 0,
  );
  // 11. Test combination of multiple empty-result filters
  const combinedEmptyFilters =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          banned_at_from: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(combinedEmptyFilters);
  TestValidator.predicate(
    "combined empty filters should return valid response",
    combinedEmptyFilters.pagination.records >= 0,
  );
}
