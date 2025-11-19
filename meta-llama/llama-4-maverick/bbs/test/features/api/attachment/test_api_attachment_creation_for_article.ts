import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_attachment_creation_for_article(
  connection: api.IConnection,
) {
  // Create a new registered user
  const registeredUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    },
  );
  typia.assertGuard(registeredUser);

  // Create a new article using the registered user
  const article =
    await api.functional.discussionBoard.registeredUser.articles.create(
      connection,
      {
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assertGuard(article);

  // Create a new attachment for the article
  const attachmentData = {
    name: RandomGenerator.name(),
    url: `https://example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  const attachment =
    await api.functional.discussionBoard.articles.attachments.create(
      connection,
      {
        articleId: article,
        body: attachmentData,
      },
    );
  typia.assertGuard(attachment);

  // Validate the created attachment
  TestValidator.equals("attachment name", attachment.name, attachmentData.name);
  TestValidator.equals("attachment URL", attachment.url, attachmentData.url);
}
