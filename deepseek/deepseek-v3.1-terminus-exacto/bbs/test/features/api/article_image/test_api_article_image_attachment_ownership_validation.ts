import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_attachment_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account for article ownership
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(owner);
  // Create article owned by first user
  const article = await api.functional.discussionBoard.user.articles.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create second user account for unauthorized access attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(unauthorizedUser);
  // Generate random attachment file data
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to attach image using unauthorized user - should fail
  await TestValidator.error("unauthorized image attachment", async () => {
    await api.functional.discussionBoard.user.articles.images.create(
      unauthorizedConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: attachmentFileId,
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  });
  // Verify owner can successfully attach image
  const imageAttachment =
    await api.functional.discussionBoard.user.articles.images.create(
      ownerConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: attachmentFileId,
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(imageAttachment);
  TestValidator.equals(
    "image attached to correct article",
    imageAttachment.article.id,
    article.id,
  );
}
