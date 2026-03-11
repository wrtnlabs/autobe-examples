import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_section_search_comprehensive(
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
  // Test 1: Empty search returns all sections
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: undefined,
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Test 2: Search with specific term
  const searchTerm = "test";
  const searchResult =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 5,
          sort: "name:asc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test 3: Pagination beyond available pages
  const beyondPageResult =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_term_that_wont_match_anything",
          page: 100,
          limit: 10,
          sort: "created_at:asc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  // Test 4: Test all sorting options
  const sortOptions = [
    "created_at:desc",
    "created_at:asc",
    "updated_at:desc",
    "updated_at:asc",
    "name:asc",
    "name:desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sortedResult =
      await api.functional.discussionBoard.superAdmin.topics.index(
        superAdminConnection,
        {
          body: {
            search: undefined,
            page: 1,
            limit: 5,
            sort: sortOption,
          } satisfies IDiscussionBoardSection.IRequest,
        },
      );
    typia.assert(sortedResult);
  }
  // Test 5: Validate section information structure
  const sampleSection =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: undefined,
          page: 1,
          limit: 1,
          sort: "created_at:desc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sampleSection);
}
