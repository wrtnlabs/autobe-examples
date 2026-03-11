import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_attachment_snapshot_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(10) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test 1: Search without filters (get all snapshots)
  const allSnapshots =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should return pagination metadata",
    allSnapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "should have data array",
    Array.isArray(allSnapshots.data),
  );
  // Test 2: Search with pagination
  if (allSnapshots.pagination.records > 0) {
    const page1 =
      await api.functional.discussionBoard.admin.attachment_snapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 2,
          } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
        },
      );
    typia.assert(page1);
    TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
    TestValidator.equals("page 1 current", page1.pagination.current, 1);
    TestValidator.predicate(
      "page 1 data length <= limit",
      page1.data.length <= 2,
    );
    // Test pagination beyond available records
    const highPage =
      await api.functional.discussionBoard.admin.attachment_snapshots.index(
        adminConnection,
        {
          body: {
            page: 999,
            limit: 10,
          } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
        },
      );
    typia.assert(highPage);
    TestValidator.equals(
      "high page returns empty data",
      highPage.data.length,
      0,
    );
    // Test 3: Search with sorting (newest first)
    const newestFirst =
      await api.functional.discussionBoard.admin.attachment_snapshots.index(
        adminConnection,
        {
          body: {
            sort: "captured_at:desc",
            limit: 5,
          } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
        },
      );
    typia.assert(newestFirst);
    // Validate sorting order (newest first)
    if (newestFirst.data.length > 1) {
      for (let i = 0; i < newestFirst.data.length - 1; i++) {
        const current = new Date(newestFirst.data[i].captured_at);
        const next = new Date(newestFirst.data[i + 1].captured_at);
        TestValidator.predicate("newest first order", current >= next);
      }
    }
    // Test 4: Search with sorting (oldest first)
    const oldestFirst =
      await api.functional.discussionBoard.admin.attachment_snapshots.index(
        adminConnection,
        {
          body: {
            sort: "captured_at:asc",
            limit: 5,
          } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
        },
      );
    typia.assert(oldestFirst);
    // Validate sorting order (oldest first)
    if (oldestFirst.data.length > 1) {
      for (let i = 0; i < oldestFirst.data.length - 1; i++) {
        const current = new Date(oldestFirst.data[i].captured_at);
        const next = new Date(oldestFirst.data[i + 1].captured_at);
        TestValidator.predicate("oldest first order", current <= next);
      }
    }
  }
  // Test 5: Search with date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {
          captured_at_start: oneWeekAgo.toISOString(),
          captured_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // Validate date range filter
  for (const snapshot of dateRangeSnapshots.data) {
    const capturedAt = new Date(snapshot.captured_at);
    TestValidator.predicate(
      "captured within date range",
      capturedAt >= oneWeekAgo && capturedAt <= now,
    );
  }
  // Test 6: Search with future date range (should return empty)
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const futureSnapshots =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {
          captured_at_start: futureStart.toISOString(),
          captured_at_end: futureEnd.toISOString(),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(futureSnapshots);
  TestValidator.predicate(
    "future date range returns empty or valid",
    futureSnapshots.data.length === 0 ||
      futureSnapshots.data.every((s) => new Date(s.captured_at) >= futureStart),
  );
  // Test 7: Search with invalid attachment ID (should return empty)
  const invalidAttachmentId = RandomGenerator.alphaNumeric(36); // Invalid UUID format
  const invalidSearch =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {
          discussion_board_attachment_id: invalidAttachmentId as string &
            tags.Format<"uuid">,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(invalidSearch);
  TestValidator.equals(
    "invalid attachment ID returns empty",
    invalidSearch.data.length,
    0,
  );
  // Test 8: Combined filters - date range with sorting
  const combinedSearch =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {
          captured_at_start: oneWeekAgo.toISOString(),
          captured_at_end: now.toISOString(),
          sort: "captured_at:desc",
          limit: 3,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 9: Validate snapshot structure
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    TestValidator.predicate(
      "snapshot has ID",
      typeof sampleSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has captured_at",
      typeof sampleSnapshot.captured_at === "string",
    );
    TestValidator.predicate(
      "snapshot has attachment",
      sampleSnapshot.attachment !== undefined,
    );
    // Validate attachment structure
    const attachment = sampleSnapshot.attachment;
    TestValidator.predicate(
      "attachment has ID",
      typeof attachment.id === "string",
    );
    TestValidator.predicate(
      "attachment has filename",
      typeof attachment.filename === "string",
    );
    TestValidator.predicate(
      "attachment has filetype",
      typeof attachment.filetype === "string",
    );
    TestValidator.predicate(
      "attachment has mime_type",
      typeof attachment.mime_type === "string",
    );
    TestValidator.predicate(
      "attachment has size_bytes",
      typeof attachment.size_bytes === "number",
    );
    TestValidator.predicate(
      "attachment has created_at",
      typeof attachment.created_at === "string",
    );
    TestValidator.predicate(
      "attachment has article",
      attachment.article !== undefined,
    );
    // Validate article structure
    const article = attachment.article;
    TestValidator.predicate("article has ID", typeof article.id === "string");
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string",
    );
    TestValidator.predicate("article has author", article.author !== undefined);
    TestValidator.predicate(
      "article has section",
      article.section !== undefined,
    );
    TestValidator.predicate("article has tags", Array.isArray(article.tags));
    TestValidator.predicate(
      "article has comments_count",
      typeof article.comments_count === "number",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof article.created_at === "string",
    );
    // Validate author structure
    const author = article.author;
    TestValidator.predicate("author has ID", typeof author.id === "string");
    TestValidator.predicate(
      "author has display_name",
      typeof author.display_name === "string",
    );
    // Validate section structure
    const section = article.section;
    TestValidator.predicate("section has ID", typeof section.id === "string");
    TestValidator.predicate(
      "section has name",
      typeof section.name === "string",
    );
    TestValidator.predicate(
      "section has created_at",
      typeof section.created_at === "string",
    );
  }
  // Test 10: Search with minimum limit
  const minLimitSearch =
    await api.functional.discussionBoard.admin.attachment_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(minLimitSearch);
  TestValidator.equals("minimum limit", minLimitSearch.pagination.limit, 1);
  TestValidator.predicate("data length <= 1", minLimitSearch.data.length <= 1);
}
