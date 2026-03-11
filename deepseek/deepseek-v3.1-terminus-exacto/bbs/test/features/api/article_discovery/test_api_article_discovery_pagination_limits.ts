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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_discovery_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Create multiple articles for pagination testing (15 articles)
  // Note: Using a placeholder section ID since we don't have section creation utility
  // In a real scenario, we'd need to create a section first or use an existing one
  const placeholderSectionId = typia.random<string & tags.Format<"uuid">>();
  const articles = await ArrayUtil.asyncRepeat(15, async (index) => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 3,
              sentenceMax: 6,
            }),
            discussion_board_section_id: placeholderSectionId,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  const totalArticles = articles.length;
  // 3. Test default pagination (page 1 with default limit)
  const defaultPage =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.equals(
    "default page current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default page has valid limit",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "default page total records",
    defaultPage.pagination.records,
    totalArticles,
  );
  TestValidator.predicate(
    "default page has valid total pages",
    defaultPage.pagination.pages > 0,
  );
  // 4. Test custom limit values
  const customLimit5 =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(customLimit5);
  TestValidator.equals(
    "custom limit 5 page",
    customLimit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit 5 limit",
    customLimit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom limit 5 total records",
    customLimit5.pagination.records,
    totalArticles,
  );
  TestValidator.predicate(
    "custom limit 5 has valid total pages",
    customLimit5.pagination.pages > 0,
  );
  TestValidator.predicate(
    "custom limit 5 data count valid",
    customLimit5.data.length <= 5,
  );
  const customLimit10 =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(customLimit10);
  TestValidator.equals(
    "custom limit 10 page",
    customLimit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit 10 limit",
    customLimit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit 10 total records",
    customLimit10.pagination.records,
    totalArticles,
  );
  TestValidator.predicate(
    "custom limit 10 has valid total pages",
    customLimit10.pagination.pages > 0,
  );
  TestValidator.predicate(
    "custom limit 10 data count valid",
    customLimit10.data.length <= 10,
  );
  // 5. Test page boundaries
  const firstPage = await api.functional.discussionBoard.member.discovery.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(secondPage);
  const totalPages = Math.ceil(totalArticles / 5);
  const lastPage = await api.functional.discussionBoard.member.discovery.index(
    memberConnection,
    {
      body: {
        page: totalPages,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    totalPages,
  );
  // 6. Test edge cases - page beyond available range
  const beyondRangePage =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: totalPages + 10,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondRangePage);
  TestValidator.equals(
    "beyond range page current",
    beyondRangePage.pagination.current,
    totalPages + 10,
  );
  TestValidator.equals(
    "beyond range page data count",
    beyondRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond range page total pages",
    beyondRangePage.pagination.pages,
    totalPages,
  );
  // 7. Test minimum limit
  const minLimitPage =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit page limit",
    minLimitPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit page data count valid",
    minLimitPage.data.length <= 1,
  );
  // 8. Validate article summary structure
  if (firstPage.data.length > 0) {
    const sampleArticle = firstPage.data[0];
    TestValidator.predicate(
      "article has id",
      typeof sampleArticle.id === "string",
    );
    TestValidator.predicate(
      "article has title",
      typeof sampleArticle.title === "string",
    );
    TestValidator.predicate(
      "article has author",
      typeof sampleArticle.author === "object",
    );
    TestValidator.predicate(
      "article has section",
      typeof sampleArticle.section === "object",
    );
    TestValidator.predicate(
      "article has tags",
      Array.isArray(sampleArticle.tags),
    );
    TestValidator.predicate(
      "article has comments_count",
      typeof sampleArticle.comments_count === "number",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof sampleArticle.created_at === "string",
    );
    // Validate author structure
    TestValidator.predicate(
      "author has id",
      typeof sampleArticle.author.id === "string",
    );
    TestValidator.predicate(
      "author has display_name",
      typeof sampleArticle.author.display_name === "string",
    );
    // Validate section structure
    TestValidator.predicate(
      "section has id",
      typeof sampleArticle.section.id === "string",
    );
    TestValidator.predicate(
      "section has name",
      typeof sampleArticle.section.name === "string",
    );
  }
  // 9. Test maximum limit boundary
  const maxLimitPage =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit page total records",
    maxLimitPage.pagination.records,
    totalArticles,
  );
  TestValidator.predicate(
    "max limit page has valid total pages",
    maxLimitPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "max limit page data count valid",
    maxLimitPage.data.length <= totalArticles,
  );
}
