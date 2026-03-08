import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_admin_file_deletion_nonexistent_file(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an article as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 2: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 3: Attempt to delete a file ID that doesn't belong to this article
  const fakeFileId = typia.random<string & tags.Format<"uuid">>();
  // Expected behavior: The API should return an error when trying to delete
  // a file that doesn't exist or doesn't belong to the article
  await TestValidator.error(
    "should fail when file ID doesn't belong to article",
    async () => {
      await api.functional.discussionBoard.admin.articles.files.erase(
        adminConnection,
        {
          articleId: article.id,
          fileId: fakeFileId,
        },
      );
    },
  );
  // Step 4: Verify article still exists after failed deletion attempt
  const retrievedArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId,
        body: {
          title: "updated title",
          content: "updated content",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(retrievedArticle);
  TestValidator.equals(
    "article still exists after failed deletion",
    retrievedArticle.id,
    article.id,
  );
}
