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
export async function test_api_article_pending_access_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection with authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/auth/join`,
      referrer: `https://example.com`,
    },
  });
  // Create a new article as the member
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  // Verify the article was created with pending status
  TestValidator.equals("article status is pending", article.status, "pending");
  // Verify the member can access their own pending article
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(memberConnection, {
      articleCode: article.code,
    });
  TestValidator.equals(
    "retrieved article matches created article",
    retrievedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "retrieved article status is pending",
    retrievedArticle.status,
    "pending",
  );
}
