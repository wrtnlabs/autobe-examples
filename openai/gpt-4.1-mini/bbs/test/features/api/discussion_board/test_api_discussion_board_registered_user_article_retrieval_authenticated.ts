import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { TestValidator } from "@nestia/e2e";

export async function test_api_discussion_board_registered_user_article_retrieval_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth join as registered user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };

  // 2. Use authorized connection to retrieve article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const article = await api.functional.discussionBoard.registeredUser.articles.at(
    userConnection,
    { articleId },
  );
  const typedArticle = typia.assert(article) as any;

  // 3. Validate properties by accessing through typedArticle
  TestValidator.predicate(
    "article has title",
    typeof typedArticle.title === "string" && typedArticle.title.length > 0,
  );
  TestValidator.predicate(
    "article has content",
    typeof typedArticle.content === "string" && typedArticle.content.length > 0,
  );
  TestValidator.predicate(
    "article has author",
    typedArticle.author !== null && typeof typedArticle.author === "object",
  );
  if (typedArticle.author) {
    TestValidator.predicate(
      "author has display name",
      typeof (typedArticle.author.displayName ?? "") === "string",
    );
  }
  TestValidator.predicate("article has files array", Array.isArray(typedArticle.files));
  TestValidator.predicate("article has images array", Array.isArray(typedArticle.images));
  TestValidator.predicate("article has tags array", Array.isArray(typedArticle.tags));
  TestValidator.predicate(
    "article has createdAt",
    typeof typedArticle.createdAt === "string" && typedArticle.createdAt.length > 0,
  );
  TestValidator.predicate(
    "article has updatedAt",
    typeof typedArticle.updatedAt === "string" || typedArticle.updatedAt === null,
  );
  TestValidator.predicate("article is not deleted", typedArticle.deletedAt === null);
}
