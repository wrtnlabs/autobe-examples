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

export async function test_api_cross_section_empty_search_results(
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
  // 2. Perform cross-section search with non-matching text
  const searchResult =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(20), // Random text unlikely to match
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate empty results
  TestValidator.equals("data array empty", searchResult.data, []);
  TestValidator.equals(
    "pagination records zero",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page valid",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit valid", searchResult.pagination.limit >= 1);
  // 4. Test with specific section filter that doesn't exist
  const sectionFilterResult =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(), // Non-existent section
          search: RandomGenerator.alphabets(15),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterResult);
  // 5. Validate empty results for section filter
  TestValidator.equals(
    "section filter data empty",
    sectionFilterResult.data,
    [],
  );
  TestValidator.equals(
    "section filter records zero",
    sectionFilterResult.pagination.records,
    0,
  );
}
