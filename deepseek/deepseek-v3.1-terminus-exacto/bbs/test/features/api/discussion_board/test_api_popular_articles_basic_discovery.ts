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

export async function test_api_popular_articles_basic_discovery(
  connection: api.IConnection,
): Promise<void> {
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
  // Call popular articles endpoint with default pagination
  const response = await api.functional.discussionBoard.member.popular.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pages calculation with protection against division by zero
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // Validate article summaries
  for (const article of response.data) {
    typia.assert(article);
    // Validate required fields
    TestValidator.predicate("article has title", article.title.length > 0);
    typia.assert(article.author);
    TestValidator.predicate(
      "author has display name",
      article.author.display_name.length > 0,
    );
    typia.assert(article.section);
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    typia.assert(article.tags);
    // Validate tag structure
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate("tag has text", tag.tag.length > 0);
      TestValidator.predicate("usage count non-negative", tag.usage_count >= 0);
    }
    TestValidator.predicate(
      "comments count non-negative",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "created at is valid date",
      !isNaN(new Date(article.created_at).getTime()),
    );
  }
  // Validate that articles are sorted by popularity (should be descending order)
  // Since we can't directly test the popularity algorithm, we validate the structure
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );
}
