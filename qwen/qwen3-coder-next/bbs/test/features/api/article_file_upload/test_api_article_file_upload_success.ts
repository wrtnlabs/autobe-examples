import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_create } from "../../../generate/generate_random_discussion_board_member_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberAuthorized =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(memberAuthorized);
  // Update connection with authentication token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuthorized.token.access,
  };
  // 2. Create a new article owned by this member
  // Note: We need to use a hardcoded section ID since we can't list sections
  // In production, this would be a real UUID from the database
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 8,
    }),
    section_id: "00000000-0000-0000-0000-000000000000" as string &
      tags.Format<"uuid">,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    { body: articleData },
  );
  typia.assert(article);
  // 3. Upload multiple files to the article
  // Note: The API only accepts file metadata, not actual file content
  // This is a limitation of the provided SDK
  const filesToUpload = ArrayUtil.repeat(3, () => ({
    originalFilename: RandomGenerator.name() + ".txt",
    mimeType: "text/plain" as string &
      tags.Pattern<"^[a-zA-Z0-9]+/[a-zA-Z0-9+.-]+$">,
  }));
  // Upload file metadata (not actual files - API limitation)
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];
  for (const fileData of filesToUpload) {
    const uploadedFile =
      await api.functional.discussionBoard.member.articles.files.create(
        memberConnection,
        {
          articleId: article.id,
          body: fileData,
        },
      );
    typia.assert(uploadedFile);
    uploadedFiles.push(uploadedFile);
  }
  // 4. Verify that each file is stored with unique identifiers
  TestValidator.predicate(
    "files have unique IDs",
    () => new Set(uploadedFiles.map((f) => f.id)).size === uploadedFiles.length,
  );
  // 5. Confirm the response contains proper file metadata
  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    const fileData = filesToUpload[i];
    TestValidator.equals(
      "original filename matches",
      file.original_filename,
      fileData.originalFilename,
    );
    TestValidator.equals(
      "mime type matches",
      file.mime_type,
      fileData.mimeType,
    );
    TestValidator.predicate("file path exists", file.file_path.length > 0);
    TestValidator.predicate("file size is positive", file.file_size > 0);
    TestValidator.equals("article id matches", file.article_id, article.id);
  }
}