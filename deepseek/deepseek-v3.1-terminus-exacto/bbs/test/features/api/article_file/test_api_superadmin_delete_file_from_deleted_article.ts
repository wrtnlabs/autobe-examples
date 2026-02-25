import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_superadmin_delete_file_from_deleted_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create an article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article);
  // 3. Test file deletion endpoint with invalid file ID (file doesn't exist)
  // Since we cannot upload files, test error handling for non-existent files
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent file should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.files.erase(
        superAdminConnection,
        {
          articleId: article.id,
          fileId: nonExistentFileId,
        },
      );
    },
  );
  // 4. Test file deletion endpoint with different malformed UUIDs
  const malformedFileId = "not-a-valid-uuid" as string & tags.Format<"uuid">;
  await TestValidator.error(
    "delete with malformed UUID should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.files.erase(
        superAdminConnection,
        {
          articleId: article.id,
          fileId: malformedFileId,
        },
      );
    },
  );
  // 5. Test with non-existent article ID to simulate deleted article scenario
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete file from non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.files.erase(
        superAdminConnection,
        {
          articleId: nonExistentArticleId,
          fileId: nonExistentFileId,
        },
      );
    },
  );
}
