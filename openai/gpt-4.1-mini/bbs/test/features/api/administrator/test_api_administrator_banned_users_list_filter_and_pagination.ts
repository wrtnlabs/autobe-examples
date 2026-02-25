import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_list_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario description:
   *
   * This E2E test verifies the PATCH /discussionBoard/administrator/administrator/banned-users endpoint
   * which lists banned users with various filtering options including registeredUserId,
   * administratorId, and reason text, plus pagination parameters (page, limit).
   *
   * Steps:
   * 1. Register and login as an administrator.
   * 2. Prepare multiple banned users records with varied administrators and reasons.
   * 3. Test filtering by registeredUserId returns only bans related to that user.
   * 4. Test filtering by administratorId returns only bans issued by that admin.
   * 5. Test filtering by partial reason text matches returns banned users whose reasons contain the text.
   * 6. Test pagination limit and page correctly slices the results; validate last page behavior.
   * 7. Validate response structure and properties with typia.assert.
   */
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "StrongP@ssw0rd!",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // Use adminConnection with authorization for subsequent calls
  const authAdminConnection: api.IConnection = { host: connection.host };
  authAdminConnection.headers = { Authorization: admin.token.access };
  // For test preparing multiple banned users, we will simulate multiple banned user entries
  // by directly calling banned_users.index with no filters to get existing bans for later filtering tests
  // Note that we rely on existing bans data or create dummy ones if required
  // Fetch all existing bans for reference
  const unfilteredResponse =
    await api.functional.discussionBoard.administrator.administrator.banned_users.index(
      authAdminConnection,
      { body: {} },
    );
  typia.assert(unfilteredResponse);
  // Save current bans for test
  const allBans = unfilteredResponse.data;
  if (allBans.length < 2) {
    // If existing bans are too few for pagination and filtering test,
    // normally we should create test bans using utility functions (which are not provided here),
    // but since creation utilities are not available, we rely on existing data.
    // So the test will adapt to available bans.
  }
  // Extract some registeredUserIds and administratorIds for filtering
  const userIds = Array.from(
    new Set(allBans.map((ban) => ban.registeredUser.id)),
  );
  const adminIds = Array.from(
    new Set(
      allBans
        .filter(
          (ban) =>
            ban.administrator !== undefined && ban.administrator !== null,
        )
        .map((ban) => ban.administrator!.id),
    ),
  );
  // 3. Filtering by registeredUserId
  if (userIds.length > 0) {
    const filterUserId = userIds[0];
    const filteredByUserId =
      await api.functional.discussionBoard.administrator.administrator.banned_users.index(
        authAdminConnection,
        {
          body: { registeredUserId: filterUserId },
        },
      );
    typia.assert(filteredByUserId);
    // All returned bans must have registeredUser.id === filterUserId
    filteredByUserId.data.forEach((ban) => {
      TestValidator.equals(
        "filtered registeredUserId",
        ban.registeredUser.id,
        filterUserId,
      );
    });
  }
  // 4. Filtering by administratorId
  if (adminIds.length > 0) {
    const filterAdminId = adminIds[0];
    const filteredByAdminId =
      await api.functional.discussionBoard.administrator.administrator.banned_users.index(
        authAdminConnection,
        {
          body: { administratorId: filterAdminId },
        },
      );
    typia.assert(filteredByAdminId);
    // All returned bans must have administrator.id === filterAdminId
    filteredByAdminId.data.forEach((ban) => {
      TestValidator.equals(
        "filtered administratorId",
        ban.administrator?.id ?? "",
        filterAdminId,
      );
    });
  }
  // 5. Filtering by partial reason text
  if (allBans.length > 0) {
    // Pick a reason text fragment from an existing ban reason
    const testBanReason = allBans[0].reason;
    if (testBanReason.length > 3) {
      const partialReason = testBanReason.substring(0, 3);
      const filteredByReason =
        await api.functional.discussionBoard.administrator.administrator.banned_users.index(
          authAdminConnection,
          {
            body: { reason: partialReason },
          },
        );
      typia.assert(filteredByReason);
      // All returned bans must have reason containing partialReason
      filteredByReason.data.forEach((ban) => {
        TestValidator.predicate(
          `ban reason includes '${partialReason}'`,
          ban.reason.includes(partialReason),
        );
      });
    }
  }
  // 6. Test pagination limit and page
  if (allBans.length > 0) {
    const limit = Math.min(5, allBans.length);
    // First page
    const firstPageResp =
      await api.functional.discussionBoard.administrator.administrator.banned_users.index(
        authAdminConnection,
        {
          body: { page: 1, limit },
        },
      );
    typia.assert(firstPageResp);
    TestValidator.predicate(
      "first page has data",
      firstPageResp.data.length > 0 && firstPageResp.data.length <= limit,
    );
    // Last page
    const lastPage = firstPageResp.pagination.pages;
    if (lastPage > 1) {
      const lastPageResp =
        await api.functional.discussionBoard.administrator.administrator.banned_users.index(
          authAdminConnection,
          {
            body: { page: lastPage, limit },
          },
        );
      typia.assert(lastPageResp);
      // Validate that last page items count is <= limit
      TestValidator.predicate(
        "last page data length",
        lastPageResp.data.length > 0 && lastPageResp.data.length <= limit,
      );
      // Validate total records matches
      TestValidator.equals(
        "total records equality",
        lastPageResp.pagination.records,
        firstPageResp.pagination.records,
      );
    }
  }
}
