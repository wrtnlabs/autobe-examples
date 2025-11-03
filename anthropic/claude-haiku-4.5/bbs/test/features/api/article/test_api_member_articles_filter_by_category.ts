import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validates member's ability to filter their articles by category selection.
 *
 * Creates a new member account, posts articles in both Economics and Politics
 * categories, then applies category filters to verify correct filtering
 * behavior. Confirms that category filtering properly isolates articles by
 * category and that filtered results maintain proper member ownership and
 * category accuracy.
 *
 * Test flow:
 *
 * 1. Register new member account
 * 2. Create article in Economics category
 * 3. Create article in Politics category
 * 4. Filter articles by Economics category - verify only Economics article
 *    returned
 * 5. Filter articles by Politics category - verify only Politics article returned
 * 6. Verify category information is present in filtered results
 * 7. Verify member ownership is maintained in filtered results
 */
export async function test_api_member_articles_filter_by_category(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberResponse);

  const memberId = memberResponse.id;
  TestValidator.equals(
    "member registered with token",
    typeof memberResponse.token.access,
    "string",
  );

  // Step 2: Create article in Economics category
  const economicsArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Growth Analysis",
        content:
          "This article discusses the current economic growth trends and their implications for future policy decisions. Economic growth is a critical indicator of national prosperity.",
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(economicsArticle);
  TestValidator.equals(
    "economics article category is economics",
    economicsArticle.category.code,
    "economics",
  );
  TestValidator.equals(
    "economics article author matches member",
    economicsArticle.author.id,
    memberId,
  );

  // Step 3: Create article in Politics category
  const politicsArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Political Discourse Analysis",
        content:
          "This article examines the current state of political discourse and its impact on governance. Political participation is essential for democratic societies.",
        category_code: "politics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(politicsArticle);
  TestValidator.equals(
    "politics article category is politics",
    politicsArticle.category.code,
    "politics",
  );
  TestValidator.equals(
    "politics article author matches member",
    politicsArticle.author.id,
    memberId,
  );

  // Step 4: Filter articles by Economics category
  const economicsFilterResult: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        category: "economics",
        search: undefined,
        author_id: undefined,
        sort_by: undefined,
        sort_order: undefined,
        page: undefined,
        limit: undefined,
        include_archived: undefined,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicsFilterResult);

  TestValidator.predicate(
    "economics filter returns at least one article",
    economicsFilterResult.data.length >= 1,
  );
  TestValidator.equals(
    "first result in economics filter is economics article",
    economicsFilterResult.data[0].id,
    economicsArticle.id,
  );
  TestValidator.equals(
    "all results in economics filter have economics category",
    economicsFilterResult.data[0].category.code,
    "economics",
  );

  // Step 5: Filter articles by Politics category
  const politicsFilterResult: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        category: "politics",
        search: undefined,
        author_id: undefined,
        sort_by: undefined,
        sort_order: undefined,
        page: undefined,
        limit: undefined,
        include_archived: undefined,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicsFilterResult);

  TestValidator.predicate(
    "politics filter returns at least one article",
    politicsFilterResult.data.length >= 1,
  );
  TestValidator.equals(
    "first result in politics filter is politics article",
    politicsFilterResult.data[0].id,
    politicsArticle.id,
  );
  TestValidator.equals(
    "all results in politics filter have politics category",
    politicsFilterResult.data[0].category.code,
    "politics",
  );

  // Step 6: Verify category information is present in filtered results
  for (const article of economicsFilterResult.data) {
    TestValidator.predicate(
      "economics article has category object",
      article.category !== undefined && article.category !== null,
    );
    TestValidator.equals(
      "economics article category code is economics",
      article.category.code,
      "economics",
    );
  }

  for (const article of politicsFilterResult.data) {
    TestValidator.predicate(
      "politics article has category object",
      article.category !== undefined && article.category !== null,
    );
    TestValidator.equals(
      "politics article category code is politics",
      article.category.code,
      "politics",
    );
  }

  // Step 7: Verify member ownership is maintained in filtered results
  for (const article of economicsFilterResult.data) {
    TestValidator.equals(
      "economics filtered article author is current member",
      article.author.id,
      memberId,
    );
  }

  for (const article of politicsFilterResult.data) {
    TestValidator.equals(
      "politics filtered article author is current member",
      article.author.id,
      memberId,
    );
  }

  // Step 8: Verify filtering provides correct isolation
  const economicsIds = new Set(economicsFilterResult.data.map((a) => a.id));
  const politicsIds = new Set(politicsFilterResult.data.map((a) => a.id));

  TestValidator.predicate(
    "economics filter excludes politics articles",
    !economicsIds.has(politicsArticle.id),
  );
  TestValidator.predicate(
    "politics filter excludes economics articles",
    !politicsIds.has(economicsArticle.id),
  );
}
