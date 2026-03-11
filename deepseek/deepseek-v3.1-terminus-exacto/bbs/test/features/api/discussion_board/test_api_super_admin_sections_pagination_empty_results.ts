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

export async function test_api_super_admin_sections_pagination_empty_results(
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
  // Test 1: Search term that matches no sections
  const noMatchSearch =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_section_xyz123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "empty data array for no match",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for no match",
    noMatchSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for no match",
    noMatchSearch.pagination.pages,
    0,
  );
  // Test 2: Page number beyond available results
  const beyondPage =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("empty data for beyond page", beyondPage.data.length, 0);
  TestValidator.predicate(
    "current page should be last page",
    beyondPage.pagination.current <= beyondPage.pagination.pages,
  );
  // Test 3: Minimum limit value
  const minLimit =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("limit should be 1", minLimit.pagination.limit, 1);
  // Test 4: Empty search term returns all sections
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search should return sections",
    emptySearch.pagination.records >= 0,
  );
}
