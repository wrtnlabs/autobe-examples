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

/**
 * Test pagination and ordering functionality for attachment category search.
 * Creates multiple attachment categories with varying order_index values,
 * then validates pagination parameters and ordering behavior.
 */
export async function test_api_attachment_category_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create multiple attachment categories with varying order_index values
  const categories = await Promise.all(
    ArrayUtil.repeat(15, (index) =>
      generate_random_discussion_board_super_admin_attachment_categories_create(
        superAdminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            order_index: index + 1,
            is_active: true,
          } satisfies IDiscussionBoardAttachmentCategory.ICreate,
        },
      ),
    ),
  );
  // 3. Test pagination with different page and limit combinations
  const page1Limit5 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(page1Limit5);
  const page2Limit5 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(page2Limit5);
  const page3Limit5 =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 3,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(page3Limit5);
  // 4. Validate pagination metadata
  TestValidator.equals("total records", page1Limit5.pagination.records, 15);
  TestValidator.equals(
    "page 1 current page",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Limit5.pagination.limit, 5);
  TestValidator.equals("page 1 total pages", page1Limit5.pagination.pages, 3);
  TestValidator.equals(
    "page 2 current page",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Limit5.pagination.limit, 5);
  TestValidator.equals(
    "page 3 current page",
    page3Limit5.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3Limit5.pagination.limit, 5);
  // 5. Validate ordering by order_index (ascending order as per specification)
  TestValidator.predicate(
    "page 1 data ordered by order_index ascending",
    () => {
      for (let i = 1; i < page1Limit5.data.length; i++) {
        if (
          page1Limit5.data[i].order_index < page1Limit5.data[i - 1].order_index
        ) {
          return false;
        }
      }
      return true;
    },
  );
  TestValidator.predicate(
    "page 2 data ordered by order_index ascending",
    () => {
      for (let i = 1; i < page2Limit5.data.length; i++) {
        if (
          page2Limit5.data[i].order_index < page2Limit5.data[i - 1].order_index
        ) {
          return false;
        }
      }
      return true;
    },
  );
  TestValidator.predicate(
    "page 3 data ordered by order_index ascending",
    () => {
      for (let i = 1; i < page3Limit5.data.length; i++) {
        if (
          page3Limit5.data[i].order_index < page3Limit5.data[i - 1].order_index
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 6. Validate no overlap between pages
  const page1Ids = new Set(page1Limit5.data.map((item) => item.id));
  const page2Ids = new Set(page2Limit5.data.map((item) => item.id));
  const page3Ids = new Set(page3Limit5.data.map((item) => item.id));
  TestValidator.predicate("page 1 and page 2 have no overlapping IDs", () => {
    for (const id of page1Ids) {
      if (page2Ids.has(id)) return false;
    }
    return true;
  });
  TestValidator.predicate("page 1 and page 3 have no overlapping IDs", () => {
    for (const id of page1Ids) {
      if (page3Ids.has(id)) return false;
    }
    return true;
  });
  TestValidator.predicate("page 2 and page 3 have no overlapping IDs", () => {
    for (const id of page2Ids) {
      if (page3Ids.has(id)) return false;
    }
    return true;
  });
  // 7. Test edge cases
  // Test page beyond total pages
  const beyondPage =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 10,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has no data", beyondPage.data.length, 0);
  // Test minimum limit
  const minLimit =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("min limit returns one item", minLimit.data.length, 1);
  // Test maximum limit
  const maxLimit =
    await api.functional.discussionBoard.superAdmin.attachment_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachmentCategory.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit returns all items", maxLimit.data.length, 15);
}
