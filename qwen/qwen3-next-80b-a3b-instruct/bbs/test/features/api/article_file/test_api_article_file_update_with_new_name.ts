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
export async function test_api_article_file_update_with_new_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  if (adminConnection.headers) {
    adminConnection.headers.Authorization = admin.token.access;
  }
  // Step 2: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  if (citizenConnection.headers) {
    citizenConnection.headers.Authorization = citizen.token.access;
  }
  // Step 3: Create article as citizen
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.citizen.articles.create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph(),
          content: RandomGenerator.content(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 4: Upload original file as citizen
  const originalFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.citizen.articles.files.create(
      citizenConnection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          name: "original_file.txt",
          extension: "txt",
          url: "https://example.com/files/original_file.txt",
          uploaded_by: citizen.id,
          uploaded_at: new Date().toISOString(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(originalFile);
  // Step 5: Switch to admin connection as moderator
  // Admin already has moderator privileges
  // Step 6: Update file name using moderator endpoint
  const updatedFile: IDiscussionBoardAttachmentFile =
    await api.functional.discussionBoard.moderator.articles.files.update(
      adminConnection,
      {
        articleId: article.id,
        fileId: originalFile.id,
        body: {
          name: "updated_file_name.txt",
          extension: originalFile.file_extension satisfies string as string,
          url: originalFile.storage_uri satisfies string as string,
          mimetype: originalFile.content_type,
        } satisfies IDiscussionBoardAttachmentFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Step 7: Validate only the name changed, all other metadata preserved
  TestValidator.equals(
    "new file name matches expected",
    updatedFile.name,
    "updated_file_name.txt",
  );
  TestValidator.equals(
    "file extension preserved",
    updatedFile.extension,
    originalFile.file_extension satisfies string as string,
  );
  TestValidator.equals(
    "file url preserved",
    updatedFile.url,
    originalFile.storage_uri satisfies string as string,
  );
  TestValidator.equals(
    "file size preserved",
    updatedFile.fileSize,
    originalFile.file_size,
  );
  TestValidator.equals(
    "file mimetype preserved",
    updatedFile.mimetype,
    originalFile.content_type,
  );
  TestValidator.equals(
    "uploaded by preserved",
    updatedFile.createdBy,
    originalFile.uploaded_by,
  );
  TestValidator.equals(
    "upload timestamp preserved",
    updatedFile.uploadAt,
    originalFile.uploaded_at,
  );
  TestValidator.predicate(
    "updated_at is after uploaded_at",
    new Date(updatedFile.updatedAt).getTime() >
      new Date(originalFile.uploaded_at).getTime(),
  );
  TestValidator.notEquals(
    "updated_at is different from uploaded_at",
    updatedFile.updatedAt,
    originalFile.uploaded_at,
  );
}