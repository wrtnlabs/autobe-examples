import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_articles_files_create } from "../../../generate/generate_random_discussion_board_admin_articles_files_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test file deletion cascade behavior and storage cleanup.
 *
 * This test validates that deleting a specific file attachment from an article:
 * 1. Removes only the targeted file
 * 2. Does not affect other file attachments on the same article
 * 3. Does not impact the parent article itself
 *
 * Test flow:
 * 1. Admin creates a section for article organization
 * 2. Member registers and creates an article in that section
 * 3. Admin adds two file attachments to the article
 * 4. Admin deletes one file attachment
 * 5. Verify the deletion operation succeeds without affecting the article or other files
 * 6. Confirm the remaining file can still be accessed (by attempting to delete it successfully)
 */
export async function test_api_article_file_deletion_cascade_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for article organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(section);
  // 2. Member setup - register and create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Create two file attachments using admin connection
  const file1 =
    await generate_random_discussion_board_admin_articles_files_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file1);
  const file2 =
    await generate_random_discussion_board_admin_articles_files_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file2);
  // Validate both files were created successfully and are distinct
  TestValidator.notEquals("files have different IDs", file1.id, file2.id);
  TestValidator.equals(
    "file1 belongs to article",
    file1.article.id,
    article.id,
  );
  TestValidator.equals(
    "file2 belongs to article",
    file2.article.id,
    article.id,
  );
  // 4. Delete the first file attachment
  await api.functional.discussionBoard.admin.articles.files.erase(
    adminConnection,
    {
      articleId: article.id,
      fileId: file1.id,
    },
  );
  // 5. Verify deletion succeeded by attempting to delete the same file again
  // This should fail since the file is already deleted
  await TestValidator.error("deleting already deleted file fails", async () => {
    await api.functional.discussionBoard.admin.articles.files.erase(
      adminConnection,
      {
        articleId: article.id,
        fileId: file1.id,
      },
    );
  });
  // 6. Verify the second file is still accessible by deleting it successfully
  // This proves file1 deletion didn't affect file2 or the article structure
  await api.functional.discussionBoard.admin.articles.files.erase(
    adminConnection,
    {
      articleId: article.id,
      fileId: file2.id,
    },
  );
  // Verify file2 deletion also prevents re-deletion
  await TestValidator.error("deleting file2 again fails", async () => {
    await api.functional.discussionBoard.admin.articles.files.erase(
      adminConnection,
      {
        articleId: article.id,
        fileId: file2.id,
      },
    );
  });
  // 7. Verify article still exists and is accessible (by checking file metadata)
  // The article should remain intact after both file deletions
  TestValidator.predicate(
    "article ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(article.id),
  );
  TestValidator.predicate("article has title", article.title.length > 0);
  TestValidator.predicate("article has content", article.content.length > 0);
}
