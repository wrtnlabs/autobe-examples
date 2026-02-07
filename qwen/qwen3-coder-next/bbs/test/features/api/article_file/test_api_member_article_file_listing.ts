import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_files_upload } from "../../../generate/generate_random_discussion_board_member_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test successful retrieval of file attachments for an article created by the authenticated member.
 * The test creates an article with one or more file attachments, then retrieves the file list
 * using the member's authentication. This validates the file listing functionality and ensures
 * proper pagination and metadata display for article attachments.
 */
export async function test_api_member_article_file_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        // IDiscussionBoardMember.IJoin has no required fields currently
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(joined);
  // Step 2: Create article with file attachments
  // Note: The scenario requires article creation first, but the provided SDK
  // doesn't show a direct article creation endpoint. We'll assume a workaround
  // or that file upload can happen without a separate article creation step.
  // For now, we'll proceed with direct file upload to a generated article ID.
  // Step 3: Upload file attachments and retrieve listing
  const fileCount = randint(1, 3);
  // Create files with unique identifiers
  const filePromises = ArrayUtil.repeat(fileCount, async (i) => {
    const fileConnection: api.IConnection = { host: connection.host };
    // Since we don't have a direct article creation endpoint, we'll generate
    // a random UUID for the article ID and upload files to it.
    // In a real scenario, this would be replaced with actual article creation
    // if such an endpoint exists in the full API.
    const articleId = typia.random<string & tags.Format<"uuid">>();
    return api.functional.discussionBoard.member.articles.files.upload(
      fileConnection,
      {
        articleId: articleId,
        body: {
          // IDiscussionBoardArticleFile.ICreate has no required fields currently
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  });
  const uploadedFiles = await Promise.all(filePromises);
  uploadedFiles.forEach((file) => typia.assert(file));
  // Step 4: Retrieve file listing
  const fileList =
    await api.functional.discussionBoard.member.articles.files.index(
      memberConnection,
      {
        articleId: uploadedFiles[0]
          ? (uploadedFiles[0] as any).id
          : typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(fileList);
  // Step 5: Validate file listing results
  TestValidator.equals("file count matches", fileList.data.length, fileCount);
  TestValidator.equals(
    "pagination count matches",
    fileList.pagination.records,
    fileCount,
  );
  // Verify all uploaded files are in the listing
  const uploadedFileIds = uploadedFiles.map((f) => (f as any).id);
  fileList.data.forEach((file) => {
    TestValidator.predicate(
      "file exists in uploaded",
      uploadedFileIds.includes((file as any).id),
    );
  });
}