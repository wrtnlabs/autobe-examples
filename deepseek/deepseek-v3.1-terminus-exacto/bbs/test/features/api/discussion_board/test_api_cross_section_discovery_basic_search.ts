import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cross_section_discovery_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create search query that will be used in test articles
  const searchTerm = "artificial intelligence";
  // 3. Perform cross-section search
  const searchResult =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 5. Validate article summary structure for each result
  for (const article of searchResult.data) {
    typia.assert(article);
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate(
      "author has display name",
      article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    TestValidator.predicate(
      "comment count non-negative",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "created at is valid date",
      new Date(article.created_at).getTime() > 0,
    );
  }
  // 6. Validate chronological ordering (newest first)
  for (let i = 1; i < searchResult.data.length; i++) {
    const currentDate = new Date(searchResult.data[i].created_at);
    const previousDate = new Date(searchResult.data[i - 1].created_at);
    TestValidator.predicate(
      "articles ordered chronologically (newest first)",
      currentDate <= previousDate,
    );
  }
}
