import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_admin_article_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create and authenticate member user to create initial article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member creates an article in a section using random section ID
  const article =
    await generate_random_discussion_board_member_sections_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 7,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
        params: {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 4. Admin updates the article with new title and content
  const updatedArticle =
    await api.functional.discussionBoard.admin.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
}