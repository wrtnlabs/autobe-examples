import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Validate admin-only listing/filter/pagination of moderation log audit trail.
 *
 * 1. Register (join) and authenticate an admin, to obtain credentials for all
 *    further requests.
 * 2. Call the moderation log listing endpoint with no filters: verify structure,
 *    result array shape, and paging payload.
 * 3. With the result set, pick a real admin_id, action_code, target_type,
 *    created_at for filter testing.
 * 4. Issue new requests with filters: by admin_id, by action_code, by target_type,
 *    by created_at_from/to, by note (free text search).
 * 5. Test pagination (page/limit, edge empty, over-large page number),
 *    collectively and individually.
 * 6. Confirm only authenticated admins may access logs: unauthenticated users
 *    should receive errors.
 *
 * Each response is asserted (typia.assert), structure is checked, and business
 * logic (including proper filtering and empty state variant) is validated with
 * TestValidator.
 */
export async function test_api_moderation_log_list_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A$1"; // satisfying password constraints
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.MinLength<8>,
      href: "https://example.com/admin/register",
      referrer: "https://example.com/login",
      ip: undefined,
    },
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id; // Save for filtered queries later

  // 2. Retrieve log list with no filters (should be paginated, possibly empty)
  const respAll =
    await api.functional.discussionBoard.admin.moderation.logs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(respAll);
  TestValidator.predicate(
    "logs response contains data array",
    Array.isArray(respAll.data),
  );
  TestValidator.predicate(
    "logs response contains pagination",
    !!respAll.pagination && typeof respAll.pagination.limit === "number",
  );

  // Determine at least one log (if present) to use for real filter values
  const exampleLog = respAll.data[0];
  let safeAdminId;
  let safeActionCode;
  let safeTargetType;
  let safeTargetId;
  let safeNote;
  let safeCreatedAt;
  if (exampleLog !== undefined) {
    safeAdminId = exampleLog.admin.id;
    safeActionCode = exampleLog.action_code;
    safeTargetType = exampleLog.target_type;
    safeTargetId = exampleLog.target_id;
    safeNote =
      typeof exampleLog.note === "string" ? exampleLog.note : undefined;
    safeCreatedAt = exampleLog.created_at;
  }

  // 3. Filter by admin_id
  if (safeAdminId !== undefined) {
    const respByAdmin =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { admin_id: safeAdminId },
        },
      );
    typia.assert(respByAdmin);
    for (const log of respByAdmin.data) {
      TestValidator.equals("filtered by admin_id", log.admin.id, safeAdminId);
    }
  }

  // 4. Filter by action_code
  if (safeActionCode !== undefined) {
    const respByAction =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { action_code: safeActionCode },
        },
      );
    typia.assert(respByAction);
    for (const log of respByAction.data) {
      TestValidator.equals(
        "filtered by action_code",
        log.action_code,
        safeActionCode,
      );
    }
  }

  // 5. Filter by target_type
  if (safeTargetType !== undefined) {
    const respByTargetType =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { target_type: safeTargetType },
        },
      );
    typia.assert(respByTargetType);
    for (const log of respByTargetType.data) {
      TestValidator.equals(
        "filtered by target_type",
        log.target_type,
        safeTargetType,
      );
    }
  }

  // 6. Filter by note (free text search)
  if (safeNote !== undefined && safeNote.length > 0) {
    const partialNote = RandomGenerator.substring(safeNote);
    const respByNote =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { note: partialNote },
        },
      );
    typia.assert(respByNote);
    for (const log of respByNote.data) {
      TestValidator.predicate(
        "filtered by note includes query",
        !!log.note && log.note.includes(partialNote),
      );
    }
  }

  // 7. Filter by target_id
  if (safeTargetId !== undefined) {
    const respByTargetId =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { target_id: safeTargetId },
        },
      );
    typia.assert(respByTargetId);
    for (const log of respByTargetId.data) {
      TestValidator.equals(
        "filtered by target_id",
        log.target_id,
        safeTargetId,
      );
    }
  }

  // 8. Filter by created_at_from/created_at_to if timestamp available
  if (safeCreatedAt !== undefined) {
    // created_at_from will match or include exampleLog
    const respByFrom =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { created_at_from: safeCreatedAt },
        },
      );
    typia.assert(respByFrom);
    for (const log of respByFrom.data) {
      TestValidator.predicate(
        "created_at >= from",
        log.created_at >= safeCreatedAt,
      );
    }
    // created_at_to should also match if from matches
    const respByTo =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { created_at_to: safeCreatedAt },
        },
      );
    typia.assert(respByTo);
    for (const log of respByTo.data) {
      TestValidator.predicate(
        "created_at <= to",
        log.created_at <= safeCreatedAt,
      );
    }
  }

  // 9. Pagination - set limit low to force multiple pages if >1 record
  const respLimit1 =
    await api.functional.discussionBoard.admin.moderation.logs.index(
      connection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(respLimit1);
  TestValidator.equals("pagination limit == 1", respLimit1.pagination.limit, 1);
  if (respLimit1.pagination.pages > 1) {
    const page2 =
      await api.functional.discussionBoard.admin.moderation.logs.index(
        connection,
        {
          body: { limit: 1, page: 2 },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination page advances",
      page2.pagination.current,
      2,
    );
  }

  // 10. Edge: filter with random unused UUID (should return empty set)
  const unusedUuid = typia.random<string & tags.Format<"uuid">>();
  const respEmpty =
    await api.functional.discussionBoard.admin.moderation.logs.index(
      connection,
      {
        body: { admin_id: unusedUuid },
      },
    );
  typia.assert(respEmpty);
  TestValidator.equals(
    "empty log list when filtering for unused UUID",
    respEmpty.data.length,
    0,
  );

  // 11. Edge: filter for logs far in the future
  const year3000 = new Date("3000-01-01T00:00:00Z").toISOString();
  const respFuture =
    await api.functional.discussionBoard.admin.moderation.logs.index(
      connection,
      {
        body: { created_at_from: year3000 },
      },
    );
  typia.assert(respFuture);
  TestValidator.equals(
    "empty log list filtering for far-future datetime",
    respFuture.data.length,
    0,
  );

  // 12. Role restriction: unauthenticated access (should fail)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin logs query should fail",
    async () => {
      await api.functional.discussionBoard.admin.moderation.logs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
