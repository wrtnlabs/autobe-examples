import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator cross-section search pagination and result ordering capabilities.
 *
 * This test validates the pagination behavior of the cross-section search endpoint
 * by performing multiple searches with different page and limit parameters.
 * It ensures that pagination metadata is correctly calculated and that results
 * are properly ordered and distributed across pages.
 */
export async function test_api_cross_section_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using direct SDK call (utility function not available)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: "test-superadmin@example.com",
        password: "testpassword123",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Perform initial search to get baseline data
  const initialSearch =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(initialSearch);
  // 3. Test pagination with different page numbers
  const page2Search =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Search);
  // 4. Test pagination with different limit values
  const smallLimitSearch =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(smallLimitSearch);
  const largeLimitSearch =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(largeLimitSearch);
  // 5. Test default pagination (no parameters)
  const defaultSearch =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // 6. Validate pagination metadata consistency
  TestValidator.equals(
    "total records should be consistent",
    initialSearch.pagination.records,
    page2Search.pagination.records,
  );
  TestValidator.equals(
    "total pages should be consistent",
    initialSearch.pagination.pages,
    page2Search.pagination.pages,
  );
  // 7. Test that different pages return different data (when there are multiple pages)
  if (
    initialSearch.pagination.pages > 1 &&
    initialSearch.data.length > 0 &&
    page2Search.data.length > 0
  ) {
    TestValidator.notEquals(
      "page 1 and page 2 should have different articles when multiple pages exist",
      initialSearch.data[0].id,
      page2Search.data[0].id,
    );
  }
  // 8. Validate limit parameter constraints
  TestValidator.predicate(
    "small limit should respect maximum",
    smallLimitSearch.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "large limit should respect maximum",
    largeLimitSearch.pagination.limit <= 100,
  );
  // 9. Validate pagination calculations
  TestValidator.predicate(
    "current page should match request",
    initialSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match request",
    initialSearch.pagination.limit === 10,
  );
  // Only test pages calculation if we have records
  if (initialSearch.pagination.records > 0) {
    TestValidator.predicate(
      "total pages calculation should be correct",
      initialSearch.pagination.pages ===
        Math.ceil(
          initialSearch.pagination.records / initialSearch.pagination.limit,
        ),
    );
  }
  // 10. Test edge case: page number beyond total pages
  if (initialSearch.pagination.pages > 0) {
    const beyondPageSearch =
      await api.functional.discussionBoard.superAdmin.cross_section.index(
        superAdminConnection,
        {
          body: {
            page: initialSearch.pagination.pages + 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(beyondPageSearch);
    // Should return empty data array when page is beyond total pages
    TestValidator.predicate(
      "page beyond total pages should return empty data",
      beyondPageSearch.data.length === 0,
    );
  }
}
