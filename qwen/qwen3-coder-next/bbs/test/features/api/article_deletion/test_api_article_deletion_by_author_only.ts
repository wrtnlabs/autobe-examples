import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_deletion_by_author_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two member accounts
  const authorConnection: api.IConnection = { host: connection.host };
  const authorData = await authorize_member_join(authorConnection, {
    body: {
      email: `author_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorData);
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberData = await authorize_member_join(otherMemberConnection, {
    body: {
      email: `other_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(otherMemberData);
  // 2. Author creates an article in a section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      authorConnection,
      {
        sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Author deletes their own article - should succeed (204 No Content)
  await api.functional.discussionBoard.member.articles.erase(authorConnection, {
    articleId: article.id,
  });
  // 4. Another member attempts to delete the article - should fail with 403 (Forbidden)
  await TestValidator.error(
    "other member cannot delete author's article",
    async () => {
      await api.functional.discussionBoard.member.articles.erase(
        otherMemberConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
  // 5. Author attempts to delete non-existent article - should fail with 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent article returns 404", async () => {
    await api.functional.discussionBoard.member.articles.erase(
      authorConnection,
      {
        articleId: nonExistentId,
      },
    );
  });
}
