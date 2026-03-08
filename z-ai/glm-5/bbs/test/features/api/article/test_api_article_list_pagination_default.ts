import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
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
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Setup: Member creates multiple articles (at least 3)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        { body: { section_id: section.id } },
      );
    return article;
  });
  // Test: Call article listing with minimal pagination parameters
  // Using base connection (unauthenticated) since article listing is public
  const response = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  TestValidator.predicate("total records > 0", response.pagination.records > 0);
  TestValidator.predicate(
    "total pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Verify response contains data
  TestValidator.predicate("has article data", response.data.length > 0);
  // Verify default sorting (created_at descending - newest first)
  for (let i = 1; i < response.data.length; i++) {
    const prevDate = new Date(response.data[i - 1].created_at).getTime();
    const currDate = new Date(response.data[i].created_at).getTime();
    TestValidator.predicate(
      `article ${i - 1} created_at >= article ${i} created_at`,
      prevDate >= currDate,
    );
  }
  // Verify deleted_at is null for all returned articles
  for (const article of response.data) {
    TestValidator.equals("deleted_at should be null", article.deleted_at, null);
  }
  // Verify created test articles appear in results
  const createdArticleIds = articles.map((a) => a.id);
  const foundArticles = response.data.filter((a) =>
    createdArticleIds.includes(a.id),
  );
  TestValidator.predicate(
    "at least one created article found",
    foundArticles.length >= 1,
  );
}
