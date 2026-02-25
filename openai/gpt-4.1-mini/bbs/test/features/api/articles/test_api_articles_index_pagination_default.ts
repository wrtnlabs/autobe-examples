import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_articles_index_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user to obtain authentication
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      } satisfies IDiscussionBoardRegisteredUser.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Use the authorized user connection for the articles index request
  // Create user-specific connection with auth header
  registeredUserConnection.headers = { Authorization: authorized.token.access };
  // 3. Request list of articles without any filters (empty body)
  const body = {} satisfies IDiscussionBoardArticle.IRequest;
  const output =
    await api.functional.discussionBoard.registeredUser.articles.index(
      registeredUserConnection,
      { body },
    );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit) ||
      output.pagination.records === 0,
  );
  // 5. Validate each article summary item
  for (const article of output.data) {
    typia.assert(article);
    TestValidator.predicate(
      "article has valid id",
      typeof article.id === "string" && article.id.length === 36,
    );
    TestValidator.predicate(
      "article has non-empty title",
      article.title.length > 0,
    );
    // Author
    const author = article.author;
    typia.assert(author);
    TestValidator.predicate(
      "author has valid id",
      typeof author.id === "string" && author.id.length === 36,
    );
    TestValidator.predicate(
      "author has non-empty email",
      author.email.length > 0,
    );
    TestValidator.predicate(
      "author has non-empty displayName",
      author.displayName.length > 0,
    );
    TestValidator.predicate(
      "author isBanned is boolean",
      typeof author.isBanned === "boolean",
    );
    TestValidator.predicate("author has createdAt", !!author.createdAt);
    TestValidator.predicate("author has updatedAt", !!author.updatedAt);
    // Section
    const section = article.section;
    typia.assert(section);
    // Section summary is empty object (as per definition), no properties to check
    // Comment Count
    TestValidator.predicate(
      "article commentCount non-negative",
      typeof article.commentCount === "number" && article.commentCount >= 0,
    );
    // Tags
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag has valid id",
        typeof tag.id === "string" && tag.id.length === 36,
      );
      TestValidator.predicate(
        "tag discussionBoardArticleId valid",
        typeof tag.discussionBoardArticleId === "string" &&
          tag.discussionBoardArticleId.length === 36,
      );
      TestValidator.predicate(
        "tag discussionBoardTagId valid",
        typeof tag.discussionBoardTagId === "string" &&
          tag.discussionBoardTagId.length === 36,
      );
      TestValidator.predicate("tag has createdAt", !!tag.createdAt);
      TestValidator.predicate("tag has updatedAt", !!tag.updatedAt);
      TestValidator.predicate("tag deletedAt is null", tag.deletedAt === null);
    }
    // Timestamp
    TestValidator.predicate("article has createdAt", !!article.createdAt);
  }
}
