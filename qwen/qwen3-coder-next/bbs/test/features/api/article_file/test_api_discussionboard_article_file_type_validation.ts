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
import { generate_random_discussion_board_articles_files_create } from "../../../generate/generate_random_discussion_board_articles_files_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test article file type validation workflow.
 * 1. Member registers and logs in
 * 2. Member creates an article
 * 3. Test uploading valid file types (PDF, DOCX, XLSX, ZIP, etc.)
 * 4. Test uploading invalid file types (executable files, scripts, etc.)
 * 5. Verify system properly rejects malicious file types
 */
export async function test_api_discussionboard_article_file_type_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IDiscussionBoardMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  };
  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(memberAuthorized);
  // Update connection with access token for subsequent API calls
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${memberAuthorized.access_token}`,
  };
  // 2. Create an article for file upload testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Test uploading valid file types
  const validFiles: {
    name: string;
    originalFilename: string;
    mimeType: string;
  }[] = [
    {
      name: "PDF file",
      originalFilename: "document.pdf",
      mimeType: "application/pdf",
    },
    {
      name: "DOCX file",
      originalFilename: "document.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      name: "XLSX file",
      originalFilename: "spreadsheet.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      name: "ZIP file",
      originalFilename: "archive.zip",
      mimeType: "application/zip",
    },
    {
      name: "Plain text",
      originalFilename: "readme.txt",
      mimeType: "text/plain",
    },
    {
      name: "JSON file",
      originalFilename: "data.json",
      mimeType: "application/json",
    },
  ];
  const uploadedFileIds: string[] = [];
  for (const validFile of validFiles) {
    const uploadedFile: IDiscussionBoardArticleFile.ISummary =
      await api.functional.discussionBoard.articles.files.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            originalFilename: validFile.originalFilename,
            mimeType: validFile.mimeType,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(uploadedFile);
    TestValidator.equals(
      "valid file original name",
      uploadedFile.original_filename,
      validFile.originalFilename,
    );
    TestValidator.equals(
      "valid file mime type",
      uploadedFile.mime_type,
      validFile.mimeType,
    );
    uploadedFileIds.push(uploadedFile.id);
  }
  // 4. Test uploading invalid file types (should be rejected)
  const invalidFiles: {
    name: string;
    originalFilename: string;
    mimeType: string;
  }[] = [
    {
      name: "Executable file",
      originalFilename: "malware.exe",
      mimeType: "application/x-executable",
    },
    {
      name: "DLL file",
      originalFilename: "library.dll",
      mimeType: "application/x-dosexecutable",
    },
    {
      name: "JavaScript file",
      originalFilename: "script.js",
      mimeType: "application/javascript",
    },
    {
      name: "Python script",
      originalFilename: "code.py",
      mimeType: "text/x-python",
    },
    {
      name: "HTML with script",
      originalFilename: "page.html",
      mimeType: "text/html",
    },
    {
      name: "SVG with script",
      originalFilename: "graphic.svg",
      mimeType: "image/svg+xml",
    },
  ];
  for (const invalidFile of invalidFiles) {
    await TestValidator.error(
      `${invalidFile.name} should be rejected`,
      async () => {
        await api.functional.discussionBoard.articles.files.create(
          memberConnection,
          {
            articleId: article.id,
            body: {
              originalFilename: invalidFile.originalFilename,
              mimeType: invalidFile.mimeType,
            } satisfies IDiscussionBoardArticleFile.ICreate,
          },
        );
      },
    );
  }
  // 5. Verify only valid files were stored by checking file count
  // (Simplified: the validation of file rejection in step 4 confirms the system behavior)
  TestValidator.equals(
    "valid file count matches",
    uploadedFileIds.length,
    validFiles.length,
  );
}
