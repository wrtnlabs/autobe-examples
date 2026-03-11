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

export async function test_api_section_article_list_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Create member accounts and articles with different tags
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
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
  typia.assert(member1Auth);
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["typescript", "javascript"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
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
  typia.assert(member2Auth);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["python", "backend"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
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
  typia.assert(member3Auth);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      member3Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["typescript", "frontend"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  const member4Connection: api.IConnection = { host: connection.host };
  const member4Auth = await authorize_member_join(member4Connection, {
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
  typia.assert(member4Auth);
  const article4 =
    await generate_random_discussion_board_member_articles_create(
      member4Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["java", "backend"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article4);
  const member5Connection: api.IConnection = { host: connection.host };
  const member5Auth = await authorize_member_join(member5Connection, {
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
  typia.assert(member5Auth);
  const article5 =
    await generate_random_discussion_board_member_articles_create(
      member5Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: undefined,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article5);
  // 3. Test filtering by single tag "typescript" - should return Articles 1 and 3
  const typescriptFilter =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["typescript"],
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(typescriptFilter);
  TestValidator.equals(
    "typescript filter count",
    typescriptFilter.data.length,
    2,
  );
  const typescriptArticleIds = typescriptFilter.data.map((a) => a.id);
  TestValidator.predicate(
    "article 1 included",
    typescriptArticleIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article 3 included",
    typescriptArticleIds.includes(article3.id),
  );
  TestValidator.predicate(
    "article 2 excluded",
    !typescriptArticleIds.includes(article2.id),
  );
  TestValidator.predicate(
    "article 4 excluded",
    !typescriptArticleIds.includes(article4.id),
  );
  TestValidator.predicate(
    "article 5 excluded",
    !typescriptArticleIds.includes(article5.id),
  );
  // 4. Test filtering by multiple tags ["python", "java"] - OR logic, should return Articles 2 and 4
  const multiTagFilter =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["python", "java"],
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(multiTagFilter);
  TestValidator.equals("multi-tag filter count", multiTagFilter.data.length, 2);
  const multiTagArticleIds = multiTagFilter.data.map((a) => a.id);
  TestValidator.predicate(
    "article 2 included",
    multiTagArticleIds.includes(article2.id),
  );
  TestValidator.predicate(
    "article 4 included",
    multiTagArticleIds.includes(article4.id),
  );
  TestValidator.predicate(
    "article 1 excluded",
    !multiTagArticleIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article 3 excluded",
    !multiTagArticleIds.includes(article3.id),
  );
  // 5. Test case-insensitive matching with "TYPESCRIPT" - should return Articles 1 and 3
  const caseInsensitiveFilter =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["TYPESCRIPT"],
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(caseInsensitiveFilter);
  TestValidator.equals(
    "case-insensitive filter count",
    caseInsensitiveFilter.data.length,
    2,
  );
  const caseInsensitiveIds = caseInsensitiveFilter.data.map((a) => a.id);
  TestValidator.predicate(
    "article 1 included (case-insensitive)",
    caseInsensitiveIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article 3 included (case-insensitive)",
    caseInsensitiveIds.includes(article3.id),
  );
  // 6. Test filtering by non-existent tag - should return empty results
  const noMatchFilter =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["nonexistent-tag-xyz"],
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(noMatchFilter);
  TestValidator.equals("no-match filter count", noMatchFilter.data.length, 0);
  // 7. Verify response structure includes all associated tags
  TestValidator.predicate(
    "article 1 has all tags",
    (typescriptFilter.data
      .find((a) => a.id === article1.id)
      ?.tags.includes("typescript") ?? false) &&
      (typescriptFilter.data
        .find((a) => a.id === article1.id)
        ?.tags.includes("javascript") ?? false),
  );
  TestValidator.predicate(
    "article 2 has all tags",
    (multiTagFilter.data
      .find((a) => a.id === article2.id)
      ?.tags.includes("python") ?? false) &&
      (multiTagFilter.data
        .find((a) => a.id === article2.id)
        ?.tags.includes("backend") ?? false),
  );
  // 8. Test pagination with tag filtering
  const paginatedFilter =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["backend"],
          sort: "newest",
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  TestValidator.equals(
    "pagination page 1 count",
    paginatedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedFilter.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedFilter.pagination.limit, 1);
  TestValidator.predicate(
    "pagination has correct total",
    paginatedFilter.pagination.records >= 2,
  );
  const paginatedFilterPage2 =
    await api.functional.discussionBoard.sections.articles.index(
      member1Connection,
      {
        sectionId: section.id,
        body: {
          tags: ["backend"],
          sort: "newest",
          page: 2,
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedFilterPage2);
  TestValidator.equals(
    "pagination page 2 count",
    paginatedFilterPage2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page 2 current",
    paginatedFilterPage2.pagination.current,
    2,
  );
}