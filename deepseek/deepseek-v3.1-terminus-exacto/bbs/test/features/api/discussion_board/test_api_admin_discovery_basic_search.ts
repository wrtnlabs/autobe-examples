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

export async function test_api_admin_discovery_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Create test articles with searchable keywords
  const searchKeywords = ["technology", "politics", "economy", "science"];
  const articles = [];
  for (const keyword of searchKeywords) {
    const article = await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: `Article about ${keyword}`,
          body: `This article discusses various aspects of ${keyword} and its impact on society.`,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // 3. Test basic keyword search
  const searchResult =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "technology",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate search results contain the keyword
  TestValidator.predicate(
    "search returns results",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "search result contains keyword",
    searchResult.data.some(
      (article) =>
        article.title.toLowerCase().includes("technology"),
    ),
  );
  // 4. Test pagination
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    searchResult.pagination.pages >= 0,
  );
  // 5. Test article summary structure
  if (searchResult.data.length > 0) {
    const sampleArticle = searchResult.data[0];
    TestValidator.predicate("article has id", !!sampleArticle.id);
    TestValidator.predicate("article has title", !!sampleArticle.title);
    TestValidator.predicate("article has author", !!sampleArticle.author);
    TestValidator.predicate("article has section", !!sampleArticle.section);
    TestValidator.predicate(
      "article has tags",
      Array.isArray(sampleArticle.tags),
    );
    TestValidator.predicate(
      "article has comments count",
      typeof sampleArticle.comments_count === "number",
    );
    TestValidator.predicate(
      "article has creation timestamp",
      !!sampleArticle.created_at,
    );
  }
  // 6. Test different pagination parameters
  const paginationTest =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "politics",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "different limit value",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginationTest.data.length <= paginationTest.pagination.limit,
  );
}