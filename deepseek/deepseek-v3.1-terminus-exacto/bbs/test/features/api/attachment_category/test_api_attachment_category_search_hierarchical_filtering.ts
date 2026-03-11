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

export async function test_api_attachment_category_search_hierarchical_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authResult.token.access}` },
  };
  // Create root-level attachment categories
  const rootCategories = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await generate_random_discussion_board_super_admin_attachment_categories_create(
      authenticatedConnection,
      {
        body: {
          name: `Root Category ${index + 1}`,
          description: `Description for root category ${index + 1}`,
          parent_id: null,
          order_index: (index + 1) * 10,
          is_active: index !== 1, // Make second category inactive
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  });
  // Create child categories under first root category
  const childCategories = await ArrayUtil.asyncRepeat(2, async (index) => {
    return await generate_random_discussion_board_super_admin_attachment_categories_create(
      authenticatedConnection,
      {
        body: {
          name: `Child Category ${index + 1}`,
          description: `Description for child category ${index + 1}`,
          parent_id: rootCategories[0].id,
          order_index: (index + 1) * 5,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  });
  // Test 1: Search all root categories (parent_id = null)
  const rootSearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          parent_id: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(rootSearchResult);
  // Validate root categories search
  TestValidator.equals(
    "root categories count",
    rootSearchResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all root categories have null parent",
    rootSearchResult.data.every((category) => category.parent === null),
  );
  TestValidator.predicate(
    "categories ordered by order_index",
    rootSearchResult.data[0].order_index <=
      rootSearchResult.data[1].order_index &&
      rootSearchResult.data[1].order_index <=
        rootSearchResult.data[2].order_index,
  );
  // Test 2: Search child categories under specific parent
  const childSearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          parent_id: rootCategories[0].id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(childSearchResult);
  // Validate child categories search
  TestValidator.equals(
    "child categories count",
    childSearchResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all child categories have correct parent",
    childSearchResult.data.every(
      (category) => category.parent?.id === rootCategories[0].id,
    ),
  );
  // Test 3: Search with text filter
  const textSearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          search: "Root Category",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(textSearchResult);
  // Validate text search
  TestValidator.predicate(
    "search returns matching categories",
    textSearchResult.data.every((category) =>
      category.name.includes("Root Category"),
    ),
  );
  // Test 4: Search with active status filter
  const activeSearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  // Validate active status filter
  TestValidator.predicate(
    "all returned categories are active",
    activeSearchResult.data.every((category) => category.is_active === true),
  );
  // Test 5: Search with combined filters
  const combinedSearchResult =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          parent_id: null,
          is_active: false,
          search: "Category",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  // Validate combined filters
  TestValidator.predicate(
    "combined filter returns correct category",
    combinedSearchResult.data.length === 1 &&
      combinedSearchResult.data[0].name === "Root Category 2" &&
      combinedSearchResult.data[0].is_active === false,
  );
  // Test 6: Validate pagination metadata
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginationTest.pagination.limit, 2);
  TestValidator.predicate(
    "pagination records count is valid",
    paginationTest.pagination.records >= 5,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paginationTest.pagination.pages >= 3,
  );
}
