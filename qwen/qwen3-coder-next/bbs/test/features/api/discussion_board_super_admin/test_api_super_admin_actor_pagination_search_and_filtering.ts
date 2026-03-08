import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_actor_pagination_search_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection for authorization using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test pagination with various parameters
  // Test page 1 with limit 5
  const page1 = await api.functional.discussionBoard.superAdmin.actors.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  // Test page 2 with limit 2
  const page2 = await api.functional.discussionBoard.superAdmin.actors.index(
    superAdminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  // 3. Test search functionality
  // Test search with empty query
  const searchAll =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(searchAll);
  // Test search with specific query
  const searchResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Test role filtering
  // Test filtering by superAdmin role
  const superAdminResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          role: "superAdmin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(superAdminResult);
  // Test filtering by member role
  const memberResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          role: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(memberResult);
  // 5. Test status filtering
  // Test filtering by active status
  const activeResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(activeResult);
  // 6. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: oneDayAgo,
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 7. Test edge cases
  // Test page beyond available range
  const beyondRange =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(beyondRange);
  TestValidator.predicate(
    "beyond range has valid pagination",
    beyondRange.pagination.records >= 0 &&
      beyondRange.pagination.pages >= 0 &&
      beyondRange.pagination.limit > 0,
  );
  // Test search with no results expected
  const noMatchSearch =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistentsearchterm12345xyz",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no match pagination is valid",
    noMatchSearch.pagination.current >= 1,
    true,
  );
  // 8. Test pagination metadata accuracy
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata consistency
  TestValidator.equals(
    "current page positive",
    paginatedResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "limit positive",
    paginatedResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "records non-negative",
    paginatedResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages non-negative",
    paginatedResult.pagination.pages >= 0,
    true,
  );
  // Test pages calculation (only if records > 0)
  if (paginatedResult.pagination.records > 0) {
    const calculatedPages = Math.ceil(
      paginatedResult.pagination.records / paginatedResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      paginatedResult.pagination.pages,
      calculatedPages,
    );
  }
  // 9. Test data array structure
  TestValidator.predicate("data is array", Array.isArray(paginatedResult.data));
  // Verify each actor has required properties
  if (paginatedResult.data.length > 0) {
    const firstActor = paginatedResult.data[0];
    typia.assert<IDiscussionBoardGuest.ISummary>(firstActor);
    // Verify required fields exist
    TestValidator.equals(
      "actor has id",
      typeof firstActor.id === "string" && firstActor.id.length > 0,
      true,
    );
    TestValidator.equals(
      "actor has session_token",
      typeof firstActor.session_token === "string" &&
        firstActor.session_token.length > 0,
      true,
    );
    TestValidator.equals(
      "actor has created_at",
      typeof firstActor.created_at === "string" &&
        firstActor.created_at.length > 0,
      true,
    );
  }
  // 10. Test default parameters (when page and limit are omitted)
  const defaultParamsResult =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(defaultParamsResult);
  TestValidator.equals(
    "default pagination works",
    defaultParamsResult.pagination.current >= 1,
    true,
  );
}
