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

export async function test_api_article_file_metadata_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create section for the article (mock section creation)
  // Since section creation is admin-only, we'll need to use an existing section
  // or mock the section data. For this test, we'll assume sections already exist
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 4: Create file attachment with initial metadata
  // Create mock attachment file data first
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const initialFile =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: attachmentFileId,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Store original values for comparison
  const originalDisplayOrder = initialFile.display_order;
  const originalCaption = initialFile.caption;
  const originalAltText = initialFile.alt_text;
  // Step 5: Update only alt_text field using PATCH
  const updatedFile =
    await api.functional.discussionBoard.user.articles.files.patchByArticleid(
      userConnection,
      {
        articleId: article.id,
        body: typia.assert<IDiscussionBoardArticleFile.IUpdate>(
          {
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            // display_order and caption are intentionally omitted to test partial update
          },
        ),
      },
    );
  typia.assert(updatedFile);
  // Step 6: Validate partial update behavior
  TestValidator.equals(
    "alt_text should be updated",
    updatedFile.alt_text !== originalAltText,
    true,
  );
  TestValidator.equals(
    "display_order should remain unchanged",
    updatedFile.display_order,
    originalDisplayOrder,
  );
  TestValidator.equals(
    "caption should remain unchanged",
    updatedFile.caption,
    originalCaption,
  );
  TestValidator.notEquals(
    "alt_text should be different after update",
    updatedFile.alt_text,
    originalAltText,
  );
  // Step 7: Verify complete response structure
  TestValidator.equals(
    "attachment_file.id should remain the same",
    updatedFile.attachment_file.id,
    initialFile.attachment_file.id,
  );
  TestValidator.equals(
    "article.id should remain the same",
    updatedFile.article.id,
    initialFile.article.id,
  );
}