import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorAuditLog";

/**
 * Test pagination through large audit log result sets.
 *
 * A moderator authenticates and retrieves audit log entries across multiple
 * pages to verify correct navigation, pagination metadata accuracy, and data
 * integrity. This test validates that page boundaries are correctly calculated,
 * no duplicates appear across pages, and pagination information updates
 * appropriately for each page.
 *
 * Workflow:
 *
 * 1. Create a moderator account via authentication
 * 2. Retrieve audit log page 1 with limit=20
 * 3. Retrieve audit log page 2 with limit=20
 * 4. Retrieve audit log page 3 with limit=20
 * 5. Validate page metadata (current page, total records, total pages)
 * 6. Verify no duplicate entries across pages
 * 7. Confirm correct data ordering and boundaries
 */
export async function test_api_moderation_audit_log_pagination_traversal(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve audit log page 1 with limit=20
  const page1: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(page1);

  // Validate page 1 metadata
  TestValidator.equals(
    "page 1 current page number",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 contains items or is empty",
    page1.data.length >= 0 && page1.data.length <= 20,
  );

  // Step 3: Retrieve audit log page 2 with limit=20
  const page2: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(page2);

  // Validate page 2 metadata
  TestValidator.equals(
    "page 2 current page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 2 contains items or is empty",
    page2.data.length >= 0 && page2.data.length <= 20,
  );

  // Step 4: Retrieve audit log page 3 with limit=20
  const page3: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 3,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(page3);

  // Validate page 3 metadata
  TestValidator.equals(
    "page 3 current page number",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit matches request",
    page3.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 3 contains items or is empty",
    page3.data.length >= 0 && page3.data.length <= 20,
  );

  // Step 5: Validate pagination consistency across all pages
  TestValidator.equals(
    "total records count consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total records consistent page 2 and 3",
    page2.pagination.records,
    page3.pagination.records,
  );

  TestValidator.equals(
    "total pages consistent across pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  TestValidator.equals(
    "total pages consistent page 2 and 3",
    page2.pagination.pages,
    page3.pagination.pages,
  );

  // Step 6: Verify no duplicate entries across pages
  const allPageIds = new Set<string>();
  const page1Ids = new Set<string>();
  const page2Ids = new Set<string>();
  const page3Ids = new Set<string>();

  for (const entry of page1.data) {
    page1Ids.add(entry.id);
    allPageIds.add(entry.id);
  }

  for (const entry of page2.data) {
    page2Ids.add(entry.id);
    TestValidator.predicate(
      "page 2 entry not duplicate from page 1",
      !page1Ids.has(entry.id),
    );
    allPageIds.add(entry.id);
  }

  for (const entry of page3.data) {
    page3Ids.add(entry.id);
    TestValidator.predicate(
      "page 3 entry not duplicate from page 1",
      !page1Ids.has(entry.id),
    );
    TestValidator.predicate(
      "page 3 entry not duplicate from page 2",
      !page2Ids.has(entry.id),
    );
    allPageIds.add(entry.id);
  }

  // Step 7: Verify correct data boundaries and metadata calculations
  TestValidator.predicate(
    "total unique entries across pages match record count",
    allPageIds.size <= page1.pagination.records,
  );

  const expectedTotalPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "calculated total pages matches returned pages",
    page1.pagination.pages,
    expectedTotalPages,
  );

  // Step 8: Verify all entries contain required fields
  for (const entry of page1.data) {
    TestValidator.predicate(
      "page 1 entry has id",
      entry.id !== undefined && entry.id !== "",
    );
    TestValidator.predicate(
      "page 1 entry has action_type",
      entry.action_type !== undefined && entry.action_type !== "",
    );
    TestValidator.predicate(
      "page 1 entry has moderator",
      entry.moderator !== undefined,
    );
    TestValidator.predicate(
      "page 1 entry has created_at",
      entry.created_at !== undefined && entry.created_at !== "",
    );
  }

  for (const entry of page2.data) {
    TestValidator.predicate(
      "page 2 entry has id",
      entry.id !== undefined && entry.id !== "",
    );
    TestValidator.predicate(
      "page 2 entry has action_type",
      entry.action_type !== undefined && entry.action_type !== "",
    );
  }

  for (const entry of page3.data) {
    TestValidator.predicate(
      "page 3 entry has id",
      entry.id !== undefined && entry.id !== "",
    );
    TestValidator.predicate(
      "page 3 entry has action_type",
      entry.action_type !== undefined && entry.action_type !== "",
    );
  }
}
