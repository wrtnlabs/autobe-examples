import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  typia.assert(authorizedUser);
  // Update authorized connection with access token
  registeredUserConnection.headers = registeredUserConnection.headers ?? {};
  registeredUserConnection.headers.Authorization = `Bearer ${authorizedUser.token.access}`;
  // 2. Create a new article by the authenticated user
  // Prepare article creation body with valid title, content, and sectionId
  // Use random title and content for demonstration
  // For sectionId, since no section creation endpoint is provided, assume
  // there exists at least one section with a known UUID.
  // As the scenario does not provide a section creation API or a way to
  // obtain actual existing section ids, we use typia.random for sectionId
  // of type uuid. However, in real test, this should be replaced by a
  // valid section id from existing data.
  const articleCreateBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    sectionId: typia.random<string & tags.Format<"uuid">>(),
    // tags and attachments are optional and left undefined for this test
  };
  // Call the article create utility function to create article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: articleCreateBody },
    );
  typia.assert(article);
  // 3. Verify that the article is saved correctly
  // Check article's required fields and that author.id matches authorizedUser.id
  TestValidator.equals(
    "article author id matches user id",
    article.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleCreateBody.content,
  );
  TestValidator.equals(
    "article sectionId matches input",
    article.section,
    articleCreateBody.sectionId,
  );
  TestValidator.predicate(
    "article has createdAt timestamp",
    article.createdAt.length > 0,
  );
  TestValidator.predicate(
    "article has updatedAt timestamp",
    article.updatedAt.length > 0,
  );
  // deletedAt can be null or undefined (optional) - skip explicit check
  // 4. Further validation can include fetching the article (if an endpoint was
  // provided), but such APIs are not listed, so consider above sufficient
}
