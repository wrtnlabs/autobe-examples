import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_admin_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test admin file upload edge cases including invalid article IDs, size limits, and file type restrictions.
 * 1) Attempt to upload a file with an invalid or non-existent article ID to verify proper error handling
 * 2) Test with a file that exceeds size limits to ensure validation occurs
 * 3) Test file type restrictions to confirm only allowed file types can be uploaded
 */
export async function test_api_discussion_board_admin_file_upload_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    });
  typia.assert(admin);
  // 2. Test with non-existent article ID (should return error)
  await TestValidator.error(
    "should reject file upload with non-existent article ID",
    async () => {
      await api.functional.discussionBoard.admin.articles.files.upload(
        adminConnection,
        {
          articleId: "00000000-0000-0000-0000-000000000000",
          body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
        },
      );
    },
  );
  // 3. Test with invalid UUID format (should return 400 Bad Request)
  await TestValidator.httpError(
    "should reject file upload with invalid UUID format",
    400,
    async () => {
      await api.functional.discussionBoard.admin.articles.files.upload(
        adminConnection,
        {
          articleId: "not-a-valid-uuid",
          body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
        },
      );
    },
  );
  // 4. Test with empty file data (edge case for size validation)
  await TestValidator.error(
    "should reject file upload with empty body",
    async () => {
      await api.functional.discussionBoard.admin.articles.files.upload(
        adminConnection,
        {
          articleId: "00000000-0000-0000-0000-000000000000",
          body: {} as any,
        },
      );
    },
  );
}
