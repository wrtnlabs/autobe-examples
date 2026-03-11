import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test browsing articles within a valid section.
 * 1. Admin joins and logs in
 * 2. Admin creates a test section
 * 3. Member joins and logs in
 * 4. Member creates 3 articles in the section
 * 5. Browse articles with pagination parameters
 * 6. Validate response structure and pagination metadata
 * 7. Verify articles are returned with correct summaries
 * 8. Test empty section scenario
 */
export async function test_api_section_articles_browse_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin creates a test section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates 3 articles in the section
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.name(3),
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: section.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // 5. Browse articles with pagination
  const browseResult =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(browseResult);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", browseResult.pagination.current, 1);
  TestValidator.equals("limit", browseResult.pagination.limit, 10);
  TestValidator.equals("total records", browseResult.pagination.records, 3);
  TestValidator.equals("total pages", browseResult.pagination.pages, 1);
  // 7. Verify articles are returned with correct summaries
  TestValidator.equals("data array length", browseResult.data.length, 3);
  for (const articleSummary of browseResult.data) {
    typia.assert(articleSummary);
    // Verify article belongs to the section
    TestValidator.equals(
      "section ID matches",
      articleSummary.section.id,
      section.id,
    );
    TestValidator.equals(
      "section name matches",
      articleSummary.section.name,
      section.name,
    );
    // Verify author is the member
    TestValidator.equals(
      "author ID matches",
      articleSummary.author.id,
      memberAuth.id,
    );
    // Verify article exists in created articles
    const found = articles.some((a) => a.id === articleSummary.id);
    TestValidator.predicate("article exists in created", found);
    // Verify required fields exist
    TestValidator.predicate(
      "has valid UUID",
      /^[0-9a-f-]{36}$/i.test(articleSummary.id),
    );
    TestValidator.predicate(
      "title is not empty",
      articleSummary.title.length > 0,
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(articleSummary.created_at)),
    );
    TestValidator.predicate(
      "comments_count is non-negative",
      articleSummary.comments_count >= 0,
    );
  }
  // 8. Test empty section scenario - create another section with no articles
  const emptySection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2) + " Empty",
          description: null,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(emptySection);
  const emptyBrowseResult =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: emptySection.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyBrowseResult);
  // Validate empty result
  TestValidator.equals(
    "empty section current page",
    emptyBrowseResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty section limit",
    emptyBrowseResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty section total records",
    emptyBrowseResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty section total pages",
    emptyBrowseResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty section data array",
    emptyBrowseResult.data.length,
    0,
  );
}
