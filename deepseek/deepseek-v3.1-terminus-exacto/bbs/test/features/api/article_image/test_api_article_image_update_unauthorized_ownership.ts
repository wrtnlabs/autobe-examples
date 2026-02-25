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

export async function test_api_article_image_update_unauthorized_ownership(
  connection: api.IConnection,
): Promise<void> {
  // Create User A connection and join
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create User B connection and join
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: In a real test, we would need to create a section first,
  // but since section creation is admin-only and not available in the provided utilities,
  // we'll use a valid UUID that may exist in the test database
  const validSectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article as User A
  const article = await api.functional.discussionBoard.user.articles.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: validSectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Note: In a real test, we would need to create an attachment file first,
  // but since file upload is not available in the provided utilities,
  // we'll use a valid UUID that may exist in the test database
  const validAttachmentFileId = typia.random<string & tags.Format<"uuid">>();
  // Create an image attachment for the article as User A
  const image =
    await api.functional.discussionBoard.user.articles.images.create(
      userAConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: validAttachmentFileId,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(image);
  // User B attempts to update User A's image metadata - should fail with 403 Forbidden
  await TestValidator.httpError("unauthorized image update", 403, async () => {
    await api.functional.discussionBoard.user.articles.images.update(
      userBConnection,
      {
        articleId: article.id,
        imageId: image.id,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  });
}
