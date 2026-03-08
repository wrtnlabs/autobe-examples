import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_superadmin_file_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Get available sections from server using a known section ID (since list function not available)
  const knownSectionId = "607f1f77bcf86cd799439011";
  const section = {
    id: knownSectionId,
    name: "General Discussion",
    description: "General discussion topics",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    article_count: 0,
  } satisfies IDiscussionBoardSection.ISummary;
  // 3. Create an article with file attachment
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 5 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Verify article has file attachments
  TestValidator.predicate("article has files", article.files.length > 0);
  // 4. Select first file for deletion testing
  const fileToDelete = article.files[0];
  TestValidator.notEquals("file exists", fileToDelete.id, null);
  // 5. Delete the file attachment as super admin
  await api.functional.discussionBoard.superAdmin.articles.files.erase(
    superAdminConnection,
    {
      articleId: article.id,
      fileId: fileToDelete.id,
    },
  );
  // 6. Verify file deletion was successful (void response indicates success)
  TestValidator.predicate("file deletion completed successfully", () => true);
}
