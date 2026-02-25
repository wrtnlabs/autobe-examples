import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_retrieval_draft_author_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user account (article author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {});
  typia.assert(author);
  // 2. Create second user account (non-author)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor = await authorize_user_join(nonAuthorConnection, {});
  typia.assert(nonAuthor);
  // 3. Create administrator connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 4. Create section for article placement
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 5. Create draft article owned by first user
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
      tags.MinLength<5> &
      tags.MaxLength<200>,
    content: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
      tags.MinLength<50>,
    discussion_board_section_id: section.id,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    { body: articleBody },
  );
  typia.assert(article);
  // 6. Test that author can retrieve their own draft article
  const authorRetrievedArticle =
    await api.functional.discussionBoard.user.articles.at(authorConnection, {
      articleId: article.id,
    });
  typia.assert(authorRetrievedArticle);
  TestValidator.equals(
    "author can retrieve their draft article",
    authorRetrievedArticle.id,
    article.id,
  );
  // 7. Test that non-author cannot retrieve draft article (authorization error)
  await TestValidator.error(
    "non-author cannot retrieve draft article",
    async () => {
      await api.functional.discussionBoard.user.articles.at(
        nonAuthorConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
