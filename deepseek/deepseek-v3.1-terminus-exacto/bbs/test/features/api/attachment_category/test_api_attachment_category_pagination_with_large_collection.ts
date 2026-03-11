import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

/**
 * Test pagination behavior when managing large attachment category collections.
 *
 * Scenario:
 * 1) Authenticate as administrator
 * 2) Create multiple attachment categories to simulate large dataset
 * 3) Test pagination with small limit values to ensure proper page navigation
 * 4) Verify total records count matches actual database count
 * 5) Test edge cases including last page with partial results, first page navigation, and invalid page numbers
 */
export async function test_api_attachment_category_pagination_with_large_collection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create large collection of attachment categories
  const categoryCount = 23; // Create 23 categories to test partial last page
  const createdCategories: IDiscussionBoardAttachmentCategory[] = [];
  for (let i = 0; i < categoryCount; i++) {
    const category =
      await generate_random_discussion_board_admin_attachment_categories_create(
        adminConnection,
        {
          body: {
            name: `Category ${i + 1}`,
            description: `Test category ${i + 1} for pagination testing`,
            order_index: i + 1,
            is_active: true,
          } satisfies IDiscussionBoardAttachmentCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }
  // 3. Test pagination with limit = 5
  const page1 =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has correct record count", page1.data.length, 5);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    categoryCount,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1.pagination.pages,
    Math.ceil(categoryCount / 5),
  );
  // 4. Test pagination with limit = 10
  const page2 =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct record count",
    page2.data.length,
    10,
  );
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    categoryCount,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2.pagination.pages,
    Math.ceil(categoryCount / 10),
  );
  // 5. Test last page with partial results
  const lastPage =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      {
        body: {
          page: Math.ceil(categoryCount / 10),
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(lastPage);
  const expectedLastPageRecords =
    categoryCount % 10 === 0 ? 10 : categoryCount % 10;
  TestValidator.equals(
    "last page has correct partial record count",
    lastPage.data.length,
    expectedLastPageRecords,
  );
  // 6. Test first page navigation
  const firstPage =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct record count",
    firstPage.data.length,
    10,
  );
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  // 7. Test invalid page number (should return empty data array)
  const invalidPage =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      {
        body: {
          page: Math.ceil(categoryCount / 10) + 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(invalidPage);
  TestValidator.equals(
    "invalid page returns empty data",
    invalidPage.data.length,
    0,
  );
  TestValidator.equals(
    "invalid page has correct current page",
    invalidPage.pagination.current,
    Math.ceil(categoryCount / 10) + 1,
  );
  // 8. Verify all created categories are accounted for in pagination
  TestValidator.equals(
    "total records match created categories",
    page1.pagination.records,
    categoryCount,
  );
}
