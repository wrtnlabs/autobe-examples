import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article creation with file and image attachments.
 *
 * 1. Authenticate as a new user via join endpoint
 * 2. Create a discussion board section
 * 3. Prepare file attachments (within limits: max 10 files, each <=10MB, total <=50MB)
 * 4. Prepare image attachments (within limits: max 20 images, each <=5MB, total <=25MB, dimensions <=8000x8000)
 * 5. Submit article creation request with title, content, sectionId, files, and images
 * 6. Verify the response includes all attachments with proper metadata
 */
export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a discussion board section
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // 3. Prepare file attachments (within limits)
  const files: IDiscussionBoardArticleFile.ICreate[] = [
    {
      original_filename: "document.pdf",
      storage_path: "file:///uploads/files/document.pdf",
      file_size: 1048576 satisfies number as number,
      mime_type: "application/pdf",
    } satisfies IDiscussionBoardArticleFile.ICreate,
    {
      original_filename: "report.docx",
      storage_path: "file:///uploads/files/report.docx",
      file_size: 524288 satisfies number as number,
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } satisfies IDiscussionBoardArticleFile.ICreate,
  ];
  // 4. Prepare image attachments (within limits)
  const images: IDiscussionBoardArticleImage.ICreate[] = [
    {
      original_filename: "photo1.jpg",
      storage_path: "file:///uploads/images/photo1.jpg",
      file_size: 2097152 satisfies number as number,
      mime_type: "image/jpeg",
      width: 1920 satisfies number as number,
      height: 1080 satisfies number as number,
    } satisfies IDiscussionBoardArticleImage.ICreate,
    {
      original_filename: "diagram.png",
      storage_path: "file:///uploads/images/diagram.png",
      file_size: 1048576 satisfies number as number,
      mime_type: "image/png",
      width: 800 satisfies number as number,
      height: 600 satisfies number as number,
    } satisfies IDiscussionBoardArticleImage.ICreate,
  ];
  // 5. Create article with attachments
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: "Article with Attachments",
        content:
          "This article demonstrates file and image attachment capabilities.",
        sectionId: section.id,
        files,
        images,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 6. Verify file attachments
  TestValidator.equals("file count", article.files.length, 2);
  const pdfFile = article.files.find((f) => f.mime_type === "application/pdf");
  TestValidator.predicate("pdf file exists", pdfFile !== undefined);
  TestValidator.equals(
    "pdf filename",
    pdfFile!.original_filename,
    "document.pdf",
  );
  TestValidator.equals("pdf file_size", pdfFile!.file_size, 1048576);
  const docxFile = article.files.find(
    (f) =>
      f.mime_type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  TestValidator.predicate("docx file exists", docxFile !== undefined);
  TestValidator.equals(
    "docx filename",
    docxFile!.original_filename,
    "report.docx",
  );
  // 7. Verify image attachments
  TestValidator.equals("image count", article.images.length, 2);
  const jpgImage = article.images.find((i) => i.mime_type === "image/jpeg");
  TestValidator.predicate("jpg image exists", jpgImage !== undefined);
  TestValidator.equals(
    "jpg filename",
    jpgImage!.original_filename,
    "photo1.jpg",
  );
  TestValidator.equals("jpg width", jpgImage!.width, 1920);
  TestValidator.equals("jpg height", jpgImage!.height, 1080);
  TestValidator.equals("jpg file_size", jpgImage!.file_size, 2097152);
  const pngImage = article.images.find((i) => i.mime_type === "image/png");
  TestValidator.predicate("png image exists", pngImage !== undefined);
  TestValidator.equals(
    "png filename",
    pngImage!.original_filename,
    "diagram.png",
  );
  TestValidator.equals("png width", pngImage!.width, 800);
  TestValidator.equals("png height", pngImage!.height, 600);
  // 8. Verify article properties
  TestValidator.equals(
    "article title",
    article.title,
    "Article with Attachments",
  );
  TestValidator.equals("section id", article.section.id, section.id);
  TestValidator.equals("author id", article.author.id, user.id);
}
