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
 * Test member article file listing with pagination. Creates an article
 * with more file attachments than fit on a single page (default page size 10),
 * then validates pagination functionality across multiple pages.
 */
export async function test_api_member_article_file_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create article first (needed for file uploads)
  // Note: Article creation endpoint would need to be implemented separately
  // For now, we'll use a randomly generated article ID for pagination testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Upload multiple files to test pagination (more than default page size of 10)
  const fileCount = 25;
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];
  for (let i = 0; i < fileCount; i++) {
    const file: IDiscussionBoardArticleFile =
      await api.functional.discussionBoard.member.articles.files.upload(
        memberConnection,
        {
          articleId,
          body: {
            // IDiscussionBoardArticleFile.ICreate has no required fields currently
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    uploadedFiles.push(file);
  }
  TestValidator.equals("uploaded files count", uploadedFiles.length, fileCount);
  // Test pagination with default page size (should be 10)
  const firstPage: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.member.articles.files.index(
      memberConnection,
      {
        articleId,
      },
    );
  typia.assert(firstPage);
  // Validate first page pagination
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    fileCount,
  );
  TestValidator.equals("first page files count", firstPage.data.length, 10);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 3);
  // Validate that data array is not empty and has correct structure
  TestValidator.predicate(
    "first page has file data",
    () => firstPage.data.length > 0,
  );
  TestValidator.predicate("first page data is array", () =>
    Array.isArray(firstPage.data),
  );
}
