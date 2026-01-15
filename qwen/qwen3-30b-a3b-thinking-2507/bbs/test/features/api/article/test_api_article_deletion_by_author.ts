import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: RandomGenerator.alphaNumeric(15),
    },
  });
  // Step 2: Create an article with valid content meeting minimum requirements
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 25,
          wordMax: 30,
        }),
        content: RandomGenerator.content(),
      },
    },
  );
  typia.assert(article);
  // Step 3: Verify article has minimum valid content (title & content)
  TestValidator.equals(
    "Article title meets minimum 50 characters requirement",
    article.title.length >= 50,
    true,
  );
  TestValidator.equals(
    "Article content meets minimum 50 characters requirement",
    article.content.length >= 50,
    true,
  );
  TestValidator.equals(
    "Article code is generated and not empty",
    article.code.length > 0,
    true,
  );
  // Step 4: Delete the article using hard delete endpoint
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    articleCode: article.code,
  });
}
