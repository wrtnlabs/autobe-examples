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

export async function test_api_article_search_with_keyword_and_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Perform search with keyword 'programming' and tag filter ['programming']
  const searchResult =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          search: "programming",
          tag_names: ["programming"],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Verify pagination metadata is present
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
  // 4. Verify each article summary structure in results
  for (const article of searchResult.data) {
    typia.assert(article);
    TestValidator.predicate("has id", article.id !== undefined);
    TestValidator.predicate("has title", article.title !== undefined);
    TestValidator.predicate("has author", article.author !== undefined);
    TestValidator.predicate("has section", article.section !== undefined);
    TestValidator.predicate("has tags", Array.isArray(article.tags));
    TestValidator.predicate("has comments_count", article.comments_count >= 0);
    TestValidator.predicate("has created_at", article.created_at !== undefined);
    TestValidator.predicate("has updated_at", article.updated_at !== undefined);
    TestValidator.predicate(
      "has deleted_at",
      article.deleted_at === null || article.deleted_at !== undefined,
    );
  }
  // 5. Verify pagination consistency
  TestValidator.equals(
    "data length matches pagination limit or remaining",
    searchResult.data.length <= searchResult.pagination.limit,
    true,
  );
}
