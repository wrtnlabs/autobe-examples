import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_section_articles_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Setup member actor
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create articles with different tags
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const tagsList = [
      ["typescript", "react"],
      ["nodejs", "express"],
      ["database", "sql"],
      ["api", "rest"],
      ["cloud", "aws"],
    ];
    return await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          title: `Test Article ${index + 1}`,
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test single tag filtering
  const tag1Result =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          tags: ["typescript"],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(tag1Result);
  // Test multiple tag filtering (AND logic)
  const multiTagResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          tags: ["typescript", "react"],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(multiTagResult);
  // Test empty result with no matching tags
  const noMatchResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          tags: ["nonexistent-tag"],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no matching tags returns empty",
    noMatchResult.data.length,
    0,
  );
  // Test pagination with tag filtering
  const paginatedResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 2,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          tags: ["typescript"],
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination count matches limit",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination offset matches request",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    paginatedResult.pagination.pages >= 0,
  );
  // Test section scoping (articles outside section excluded)
  const otherSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      adminConnection,
      {
        body: {
          name: "Other Section",
          description: "Another test section",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  const otherSectionArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId: otherSection.id,
        body: {
          title: "Article in Other Section",
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  const sectionFilteredResult =
    await api.functional.discussionBoard.sections.articles.index(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          tags: [],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilteredResult);
  const otherSectionArticleIds = sectionFilteredResult.data.map((a) => a.id);
  TestValidator.predicate(
    "other section articles excluded",
    !otherSectionArticleIds.includes(otherSectionArticle.id),
  );
}
