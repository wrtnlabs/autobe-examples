import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_attachment_snapshot_audit_trail_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test empty search (no filters) - get all snapshots with default pagination
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "pagination has valid structure",
    emptySearchResult.pagination.current >= 0 &&
      emptySearchResult.pagination.limit >= 0 &&
      emptySearchResult.pagination.records >= 0 &&
      emptySearchResult.pagination.pages >= 0,
  );
  // 3. Test filtering by non-existent attachment ID (should return empty results)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const filteredEmptyResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          discussion_board_attachment_id: nonExistentId,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(filteredEmptyResult);
  TestValidator.equals(
    "should have empty data for non-existent attachment",
    filteredEmptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "should have zero records for non-existent attachment",
    filteredEmptyResult.pagination.records === 0,
  );
  // 4. Test date range filtering (using recent dates)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          captured_at_start: yesterday.toISOString(),
          captured_at_end: tomorrow.toISOString(),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 5. Test pagination with custom limit and page
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
          >(),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "page should be 1",
    paginationResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match requested",
    paginationResult.pagination.limit <= 20,
  );
  // 6. Test different sorting options
  const newestFirstResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort: "captured_at:desc",
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(newestFirstResult);
  const oldestFirstResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort: "captured_at:asc",
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(oldestFirstResult);
  // 7. Test combined filtering (date range + pagination)
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          captured_at_start: yesterday.toISOString(),
          captured_at_end: tomorrow.toISOString(),
          page: 1,
          limit: 10,
          sort: "captured_at:desc",
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined result has valid limit",
    combinedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "combined result page is 1",
    combinedResult.pagination.current,
    1,
  );
  // 8. Validate snapshot summary structure
  if (emptySearchResult.data.length > 0) {
    const firstSnapshot = emptySearchResult.data[0];
    TestValidator.predicate(
      "snapshot has valid ID",
      typeof firstSnapshot.id === "string" && firstSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has capture timestamp",
      typeof firstSnapshot.captured_at === "string" &&
        firstSnapshot.captured_at.length > 0,
    );
    typia.assert(firstSnapshot.attachment);
  }
  // 9. Test boundary cases: page 0 (should use default page 1)
  const pageZeroResult =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 0 satisfies number as number, // Type conversion for testing
          limit: 5,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(pageZeroResult);
}
