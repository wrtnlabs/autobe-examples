import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_categories_create";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

export async function test_api_attachment_category_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create attachment categories with specific names
  const category1 =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Documents",
          description: "Document files category",
          order_index: 1,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category1);
  const category2 =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Images",
          description: "Image files category",
          order_index: 2,
          is_active: true, // Changed to active to ensure empty results for inactive filter
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category2);
  const category3 =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Archives",
          description: "Archive files category",
          order_index: 3,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category3);
  // Test 1: Search term that doesn't match any category
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          search: "NonexistentCategoryName",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "empty data array for non-matching search",
    searchResult1.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-matching search",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-matching search",
    searchResult1.pagination.pages,
    0,
  );
  // Test 2: Search term that doesn't match any description
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          search: "VideoFiles",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty data array for non-matching description search",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-matching description search",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-matching description search",
    searchResult2.pagination.pages,
    0,
  );
  // Test 3: Non-existent parent_id filter
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty data array for non-existent parent_id",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent parent_id",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent parent_id",
    searchResult3.pagination.pages,
    0,
  );
  // Test 4: Activation status filter that yields zero results (all categories are active)
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty data array for inactive filter with all active categories",
    searchResult4.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for inactive filter",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for inactive filter",
    searchResult4.pagination.pages,
    0,
  );
  // Test 5: Combination of search term and activation status that yields no results
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          search: "Documents",
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals(
    "empty data array for combination filter",
    searchResult5.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combination filter",
    searchResult5.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for combination filter",
    searchResult5.pagination.pages,
    0,
  );
  // Test 6: Empty search with non-matching activation status
  const searchResult6 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: false,
          search: "AudioFiles",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult6);
  TestValidator.equals(
    "empty data array for combined non-matching filters",
    searchResult6.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combined non-matching filters",
    searchResult6.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for combined non-matching filters",
    searchResult6.pagination.pages,
    0,
  );
  // Test 7: Null parent_id filter when all categories have parents (create a child category)
  const parentCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "ParentCategory",
          description: "Parent category for testing",
          order_index: 4,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const childCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "ChildCategory",
          description: "Child category with parent",
          order_index: 5,
          is_active: true,
          parent_id: parentCategory.id,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // Search for root categories (null parent_id) when we only have child categories
  const searchResult7 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(searchResult7);
  // This should return the original three categories plus the parent category (all root categories)
  TestValidator.predicate(
    "should return root categories only",
    searchResult7.data.length >= 4,
  );
}
