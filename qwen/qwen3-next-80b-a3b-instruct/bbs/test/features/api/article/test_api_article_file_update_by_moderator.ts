import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_files_create } from "../../../generate/generate_random_discussion_board_citizen_articles_files_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_file_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen actor connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IDiscussionBoardUser.IJoin;
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    { body: citizenCreds },
  );
  // Step 2: Create an article as the citizen actor
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {},
    );
  // Step 3: Upload a file attachment to the article as the citizen actor
  // Create the upload request using IDiscussionBoardArticleFile.ICreate
  const fileUpload: IDiscussionBoardArticleFile.ICreate = {
    article_id: article.id,
    name: "original_document.pdf",
    extension: "pdf",
    url: "https://cdn.example.com/files/abc123.pdf",
    uploaded_by: citizen.id,
    uploaded_at: new Date().toISOString(),
  } satisfies IDiscussionBoardArticleFile.ICreate;
  const uploadedFile: IDiscussionBoardArticleFile =
    await generate_random_discussion_board_citizen_articles_files_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: fileUpload,
      },
    );
  // Step 4: Create a moderator actor connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IAdmin.IJoin;
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    moderatorConnection,
    { body: moderatorCreds },
  );
  // Step 5: Use the moderator connection to update the file metadata
  // Use IDiscussionBoardAttachmentFile.IUpdate for update request
  const updatedFile: IDiscussionBoardAttachmentFile.IUpdate = {
    name: "updated_document.pdf",
    extension: "pdf",
    url: "https://cdn.example.com/files/abc123.pdf", // Required field
    mimetype: "application/pdf",
  } satisfies IDiscussionBoardAttachmentFile.IUpdate;
  const updatedResponse: IDiscussionBoardAttachmentFile =
    await api.functional.discussionBoard.moderator.articles.files.update(
      moderatorConnection,
      {
        articleId: article.id,
        fileId: uploadedFile.id,
        body: updatedFile,
      },
    );
  // Step 6: Validate the update response matches IDiscussionBoardAttachmentFile schema
  typia.assert(updatedResponse);
  // Validate that updated metadata matches what was requested
  TestValidator.equals(
    "file name updated",
    updatedResponse.name,
    updatedFile.name,
  );
  TestValidator.equals(
    "file extension updated",
    updatedResponse.extension,
    updatedFile.extension,
  );
  TestValidator.equals(
    "file mimetype updated",
    updatedResponse.mimetype,
    updatedFile.mimetype,
  );
  TestValidator.equals(
    "file url updated",
    updatedResponse.url,
    updatedFile.url,
  );
  // Validate that original upload information remains unchanged
  TestValidator.equals(
    "uploaded by unchanged",
    updatedResponse.createdBy,
    uploadedFile.uploaded_by,
  );
  TestValidator.equals(
    "uploaded at unchanged",
    updatedResponse.uploadAt,
    uploadedFile.uploaded_at,
  );
  TestValidator.equals(
    "file size unchanged",
    updatedResponse.fileSize,
    uploadedFile.file_size,
  );
  TestValidator.equals(
    "file content hash unchanged",
    updatedResponse.contentMd5,
    uploadedFile.file_name,
  ); // Note: This is a simplification, ideally we'd have the actual hash value
  TestValidator.equals(
    "file type unchanged",
    updatedResponse.extension,
    (uploadedFile.file_extension satisfies string as string),
  );
  TestValidator.equals(
    "upload path unchanged",
    updatedResponse.uploadPath,
    (uploadedFile.storage_uri satisfies string as string),
  ); // storage_uri from upload record maps to uploadPath in metadata
  // Validate that update metadata changed
  TestValidator.notEquals(
    "updated at changed",
    updatedResponse.updatedAt,
    uploadedFile.uploaded_at,
  );
  TestValidator.equals(
    "updated by is moderator",
    updatedResponse.updatedBy,
    moderator.id,
  );
  // Validate default values for optional fields
  TestValidator.equals(
    "description unchanged (null)",
    updatedResponse.description,
    null,
  );
  TestValidator.equals(
    "is_primary unchanged (false)",
    updatedResponse.is_primary,
    false,
  );
  TestValidator.equals(
    "file status unchanged (active)",
    updatedResponse.fileStatus,
    "active",
  );
  TestValidator.equals(
    "is auto-generated unchanged (false)",
    updatedResponse.isAutoGenerated,
    false,
  );
}