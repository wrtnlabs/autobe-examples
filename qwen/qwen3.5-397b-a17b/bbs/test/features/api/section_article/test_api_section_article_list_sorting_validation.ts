import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_article_list_sorting_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 2. Member setup - create articles
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
  // 3. Create multiple articles for sorting validation
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
        },
      },
    );
  typia.assert(article1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
        },
      },
    );
  typia.assert(article2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
        },
      },
    );
  typia.assert(article3);
  // 4. Test sort=newest (descending - most recent first)
  const newestResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestResult);
  TestValidator.predicate(
    "newest sort returns articles",
    newestResult.data.length >= 3,
  );
  TestValidator.equals(
    "first article is most recent",
    newestResult.data[0].id,
    article3.id,
  );
  TestValidator.equals(
    "second article is middle",
    newestResult.data[1].id,
    article2.id,
  );
  TestValidator.equals(
    "third article is oldest",
    newestResult.data[2].id,
    article1.id,
  );
  // 5. Test sort=oldest (ascending - oldest first)
  const oldestResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          sort: "oldest",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestResult);
  TestValidator.predicate(
    "oldest sort returns articles",
    oldestResult.data.length >= 3,
  );
  TestValidator.equals(
    "first article is oldest",
    oldestResult.data[0].id,
    article1.id,
  );
  TestValidator.equals(
    "second article is middle",
    oldestResult.data[1].id,
    article2.id,
  );
  TestValidator.equals(
    "third article is most recent",
    oldestResult.data[2].id,
    article3.id,
  );
  // 6. Test default sorting (no sort parameter - should default to newest)
  const defaultResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default sort returns articles",
    defaultResult.data.length >= 3,
  );
  TestValidator.equals(
    "default first article is most recent",
    defaultResult.data[0].id,
    article3.id,
  );
  TestValidator.equals(
    "default second article is middle",
    defaultResult.data[1].id,
    article2.id,
  );
  TestValidator.equals(
    "default third article is oldest",
    defaultResult.data[2].id,
    article1.id,
  );
  // 7. Test pagination with newest sort
  const paginatedNewest =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          sort: "newest",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedNewest);
  TestValidator.equals(
    "paginated newest page 1 has 2 articles",
    paginatedNewest.data.length,
    2,
  );
  TestValidator.equals(
    "paginated newest first is most recent",
    paginatedNewest.data[0].id,
    article3.id,
  );
  TestValidator.equals(
    "paginated newest second is middle",
    paginatedNewest.data[1].id,
    article2.id,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedNewest.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has more pages",
    paginatedNewest.pagination.pages >= 2,
  );
  // 8. Test pagination with oldest sort - page 2
  const paginatedOldestPage2 =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          sort: "oldest",
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedOldestPage2);
  TestValidator.predicate(
    "paginated oldest page 2 has articles",
    paginatedOldestPage2.data.length >= 1,
  );
  TestValidator.equals(
    "paginated oldest page 2 first is most recent",
    paginatedOldestPage2.data[0].id,
    article3.id,
  );
  TestValidator.equals(
    "pagination page 2 current",
    paginatedOldestPage2.pagination.current,
    2,
  );
  // 9. Validate article metadata consistency across sort orders
  const newestArticle = newestResult.data.find((a) => a.id === article1.id);
  const oldestArticle = oldestResult.data.find((a) => a.id === article1.id);
  TestValidator.predicate(
    "article exists in newest sort",
    newestArticle !== undefined,
  );
  TestValidator.predicate(
    "article exists in oldest sort",
    oldestArticle !== undefined,
  );
  if (newestArticle && oldestArticle) {
    TestValidator.equals(
      "article title consistent",
      newestArticle.title,
      oldestArticle.title,
    );
    TestValidator.equals(
      "article author consistent",
      newestArticle.author.id,
      oldestArticle.author.id,
    );
    TestValidator.equals(
      "article created_at consistent",
      newestArticle.created_at,
      oldestArticle.created_at,
    );
  }
}
