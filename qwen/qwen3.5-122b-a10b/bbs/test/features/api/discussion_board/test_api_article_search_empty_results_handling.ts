import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_article_search_empty_results_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Perform search with non-existent keyword
  const keywordSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          search: "nonexistent_keyword_12345",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // 3. Verify empty results for keyword search
  TestValidator.equals(
    "keyword search returns empty data",
    keywordSearch.data,
    [],
  );
  TestValidator.equals(
    "keyword search records count",
    keywordSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "keyword search pages count",
    keywordSearch.pagination.pages,
    0,
  );
  // 4. Perform search with non-matching tag filter
  const tagSearch = await api.functional.discussionBoard.member.articles.search(
    memberConnection,
    {
      body: {
        tag_names: ["completely-different-tag"],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagSearch);
  // 5. Verify empty results for tag search
  TestValidator.equals("tag search returns empty data", tagSearch.data, []);
  TestValidator.equals(
    "tag search records count",
    tagSearch.pagination.records,
    0,
  );
  TestValidator.equals("tag search pages count", tagSearch.pagination.pages, 0);
}
