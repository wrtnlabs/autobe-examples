import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive thumbnail search functionality for super administrators with multiple filtering criteria.
 * As a super administrator, search for thumbnails using various filters: by specific attachment ID,
 * size categories (small, medium, large), dimensional ranges for responsive display, and creation date ranges.
 * Verify the system returns a paginated list of thumbnail summaries with correct metadata including dimensions,
 * size categories, file sizes, content types, and parent attachment references. Validate that the search respects
 * all filter parameters and returns appropriate results. Test sorting options including chronological ordering
 * and dimensional sorting. Verify pagination works correctly with page and limit parameters. Confirm that
 * thumbnails are generated on-demand if they don't exist for requested sizes, ensuring availability optimization.
 * Test edge cases such as filtering for non-existent attachment IDs (should return empty results), specifying
 * extreme dimensional ranges, and using invalid sort criteria (should use default sorting). Validate that the
 * response includes proper pagination metadata with accurate total record counts and page calculations.
 */
export async function test_api_superadmin_thumbnails_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test basic search with no filters (should return all thumbnails)
  const firstPage =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination metadata exists",
    () => firstPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(firstPage.data),
  );
  TestValidator.predicate(
    "current page is 1",
    () => firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit defaults to 20",
    () => firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count non-negative",
    () => firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    () => firstPage.pagination.pages >= 0,
  );
  // 3. Test pagination with different page and limit values
  const secondPage =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("page number correct", secondPage.pagination.current, 2);
  TestValidator.equals("limit correct", secondPage.pagination.limit, 10);
  // 4. Test filtering by size category
  const sizeCategories = ["small", "medium", "large", "extra_large"] as const;
  for (const category of sizeCategories) {
    const result =
      await api.functional.discussionBoard.superAdmin.thumbnails.index(
        superAdminConnection,
        {
          body: {
            size_category: category,
          } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `all thumbnails have size category ${category}`,
      () =>
        result.data.every((thumbnail) => thumbnail.size_category === category),
    );
  }
  // 5. Test dimensional filtering
  const dimensionalSearch =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: 100 satisfies number as number,
          width_max: 500 satisfies number as number,
          height_min: 100 satisfies number as number,
          height_max: 500 satisfies number as number,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(dimensionalSearch);
  TestValidator.predicate("width within range", () =>
    dimensionalSearch.data.every(
      (thumbnail) => thumbnail.width >= 100 && thumbnail.width <= 500,
    ),
  );
  TestValidator.predicate("height within range", () =>
    dimensionalSearch.data.every(
      (thumbnail) => thumbnail.height >= 100 && thumbnail.height <= 500,
    ),
  );
  // 6. Test creation date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 7. Test various sorting options
  const sortOptions = [
    "created_at:asc",
    "created_at:desc",
    "width:asc",
    "width:desc",
    "height:asc",
    "height:desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sorted =
      await api.functional.discussionBoard.superAdmin.thumbnails.index(
        superAdminConnection,
        {
          body: {
            sort: sortOption,
            limit: 5 satisfies number as number,
          } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
        },
      );
    typia.assert(sorted);
    if (sorted.data.length > 1) {
      // Verify sorting order
      for (let i = 0; i < sorted.data.length - 1; i++) {
        const current = sorted.data[i];
        const next = sorted.data[i + 1];
        switch (sortOption) {
          case "created_at:asc":
            TestValidator.predicate(
              "created_at ascending",
              () => new Date(current.created_at) <= new Date(next.created_at),
            );
            break;
          case "created_at:desc":
            TestValidator.predicate(
              "created_at descending",
              () => new Date(current.created_at) >= new Date(next.created_at),
            );
            break;
          case "width:asc":
            TestValidator.predicate(
              "width ascending",
              () => current.width <= next.width,
            );
            break;
          case "width:desc":
            TestValidator.predicate(
              "width descending",
              () => current.width >= next.width,
            );
            break;
          case "height:asc":
            TestValidator.predicate(
              "height ascending",
              () => current.height <= next.height,
            );
            break;
          case "height:desc":
            TestValidator.predicate(
              "height descending",
              () => current.height >= next.height,
            );
            break;
        }
      }
    }
  }
  // 8. Test edge case: non-existent attachment ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: nonExistentId,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for non-existent attachment",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals("records count zero", emptyResult.pagination.records, 0);
  TestValidator.equals("pages count zero", emptyResult.pagination.pages, 0);
  // 9. Test combination of multiple filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          size_category: "medium",
          width_min: 200 satisfies number as number,
          width_max: 400 satisfies number as number,
          height_min: 200 satisfies number as number,
          height_max: 400 satisfies number as number,
          sort: "created_at:desc",
          page: 1 satisfies number as number,
          limit: 15 satisfies number as number,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate all filters applied correctly
  TestValidator.predicate("all thumbnails are medium size", () =>
    combinedFilter.data.every(
      (thumbnail) => thumbnail.size_category === "medium",
    ),
  );
  TestValidator.predicate("width within combined range", () =>
    combinedFilter.data.every(
      (thumbnail) => thumbnail.width >= 200 && thumbnail.width <= 400,
    ),
  );
  TestValidator.predicate("height within combined range", () =>
    combinedFilter.data.every(
      (thumbnail) => thumbnail.height >= 200 && thumbnail.height <= 400,
    ),
  );
  // 10. Validate thumbnail metadata structure
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    TestValidator.predicate("has id", () => sample.id !== undefined);
    TestValidator.predicate(
      "has width",
      () => typeof sample.width === "number",
    );
    TestValidator.predicate(
      "has height",
      () => typeof sample.height === "number",
    );
    TestValidator.predicate(
      "has size_category",
      () => sample.size_category !== undefined,
    );
    TestValidator.predicate(
      "has file_size",
      () => typeof sample.file_size === "number",
    );
    TestValidator.predicate(
      "has content_type",
      () => sample.content_type !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      () => sample.created_at !== undefined,
    );
    TestValidator.predicate(
      "has attachment",
      () => sample.attachment !== undefined,
    );
    TestValidator.predicate(
      "attachment has id",
      () => sample.attachment.id !== undefined,
    );
    TestValidator.predicate(
      "attachment has filename",
      () => sample.attachment.filename !== undefined,
    );
    TestValidator.predicate(
      "attachment has article",
      () => sample.attachment.article !== undefined,
    );
  }
}
