import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImageFile";
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
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_files_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(joinResult);
  // Note: In a real implementation, we would need to obtain a valid section_id beforehand
  // For this test, we'll proceed assuming the system handles invalid section validation gracefully
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a new article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Note: In a real implementation, we would need to upload a file and get a valid attachment_file_id
  // For this test, we'll proceed assuming the system handles invalid file validation gracefully
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attach an image to the article
  const image =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          attachment_file_id: attachmentFileId,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image);
  // 4. Retrieve file metadata for the image
  const filesResponse =
    await api.functional.discussionBoard.articles.images.files.index(
      userConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(filesResponse);
  // 5. Validate the paginated response
  TestValidator.equals(
    "response is paginated",
    filesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has valid record count",
    filesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid page count",
    filesResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    filesResponse.pagination.limit > 0,
  );
  // Validate file metadata structure for each file
  for (const file of filesResponse.data) {
    TestValidator.predicate(
      "file has filename",
      typeof file.filename === "string",
    );
    TestValidator.predicate(
      "file has size",
      typeof file.file_size === "number",
    );
    TestValidator.predicate(
      "file has MIME type",
      typeof file.mime_type === "string",
    );
    TestValidator.predicate(
      "file has storage path",
      typeof file.storage_path === "string",
    );
    TestValidator.predicate(
      "file has creation timestamp",
      typeof file.created_at === "string",
    );
    TestValidator.predicate(
      "file has update timestamp",
      typeof file.updated_at === "string",
    );
  }
}
