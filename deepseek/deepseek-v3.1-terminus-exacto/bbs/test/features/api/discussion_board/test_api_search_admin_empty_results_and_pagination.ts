import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_search_admin_empty_results_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create some articles for testing
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test 1: Search with non-existent text query
  const emptySearchResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "nonexistent_text_query_that_will_not_match_anything",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search should return zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should return zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search should have empty data array",
    emptySearchResult.data.length,
    0,
  );
  // Test 2: Search with pagination beyond available results
  const highPageSearchResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "nonexistent_text",
        page: 100,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(highPageSearchResult);
  TestValidator.equals(
    "high page search should return zero records",
    highPageSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page search should return zero pages",
    highPageSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high page search should have empty data array",
    highPageSearchResult.data.length,
    0,
  );
  // Test 3: Search with non-existent section filter
  const sectionSearchResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sectionSearchResult);
  TestValidator.equals(
    "non-existent section search should return zero records",
    sectionSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent section search should return zero pages",
    sectionSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent section search should have empty data array",
    sectionSearchResult.data.length,
    0,
  );
  // Test 4: Search with minimum pagination limits
  const minLimitSearchResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "nonexistent_text",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(minLimitSearchResult);
  TestValidator.equals(
    "min limit search should return zero records",
    minLimitSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "min limit search should have correct limit",
    minLimitSearchResult.pagination.limit,
    1,
  );
  // Test 5: Search with maximum pagination limits
  const maxLimitSearchResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "nonexistent_text",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(maxLimitSearchResult);
  TestValidator.equals(
    "max limit search should return zero records",
    maxLimitSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "max limit search should have correct limit",
    maxLimitSearchResult.pagination.limit,
    100,
  );
}
