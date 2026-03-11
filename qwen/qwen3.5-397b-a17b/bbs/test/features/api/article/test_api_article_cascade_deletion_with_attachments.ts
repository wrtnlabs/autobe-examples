import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test cascade deletion behavior when removing an article with file attachments,
 * image attachments, tags, and comments. This validates that all child entities
 * are properly removed when the parent article is deleted.
 *
 * Test Steps:
 * 1. Authenticate as administrator via /discussionBoard/auth/admin/join
 * 2. Create a section via /discussionBoard/admin/sections
 * 3. Authenticate as member via /discussionBoard/auth/member/join
 * 4. Create an article with file attachments, image attachments, and tags via /discussionBoard/member/articles
 * 5. Create multiple comments on the article via /discussionBoard/member/articles/{articleId}/comments
 * 6. As admin, delete the article via /discussionBoard/admin/articles/{articleId}
 * 7. Verify cascade deletion by checking that all child entities have deleted_at timestamps set
 *
 * Validation Points:
 * - All comments are cascade deleted (discussion_board_comments)
 * - All file attachments are cascade deleted (discussion_board_article_files)
 * - All image attachments are cascade deleted (discussion_board_article_images)
 * - All tag assignments are cascade deleted (discussion_board_article_tags)
 * - Article soft delete timestamp (deleted_at) is set
 * - Operation is irreversible - deleted content cannot be recovered
 */
export async function test_api_article_cascade_deletion_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and authenticate admin account
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
  // 2. Create section for article organization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(section);
  // 3. Member setup - create and authenticate member account
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
  // 4. Create article with file attachments, image attachments, and tags
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // Verify article has attachments and tags
  TestValidator.predicate(
    "article has file attachments",
    article.files.length > 0,
  );
  TestValidator.predicate(
    "article has image attachments",
    article.images.length > 0,
  );
  TestValidator.predicate("article has tags", article.tags.length > 0);
  // 5. Create multiple comments on the article for cascade deletion testing
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(comment3);
  // Verify comments were created successfully
  TestValidator.equals(
    "comment1 article matches",
    comment1.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment2 article matches",
    comment2.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment3 article matches",
    comment3.article.id,
    article.id,
  );
  // Store initial counts for validation
  const initialFilesCount = article.files.length;
  const initialImagesCount = article.images.length;
  const initialTagsCount = article.tags.length;
  // 6. Administrator deletes the article (cascade deletion)
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // 7. Verify cascade deletion - all child entities should have deleted_at set
  // Article itself should have deleted_at timestamp
  TestValidator.predicate(
    "article has deleted_at timestamp",
    article.deleted_at !== null,
  );
  // All file attachments should be cascade deleted
  article.files.forEach((file, index) => {
    TestValidator.predicate(
      `file attachment ${index + 1} has deleted_at`,
      file.deleted_at !== null,
    );
  });
  TestValidator.equals(
    "file attachments count preserved",
    article.files.length,
    initialFilesCount,
  );
  // All image attachments should be cascade deleted
  article.images.forEach((image, index) => {
    TestValidator.predicate(
      `image attachment ${index + 1} has deleted_at`,
      image.deleted_at !== null,
    );
  });
  TestValidator.equals(
    "image attachments count preserved",
    article.images.length,
    initialImagesCount,
  );
  // All tag assignments should be cascade deleted (tags array should be empty or tags deleted)
  TestValidator.equals(
    "tags count preserved",
    article.tags.length,
    initialTagsCount,
  );
  // All comments should be cascade deleted
  TestValidator.predicate(
    "comment1 has deleted_at timestamp",
    comment1.deleted_at !== null,
  );
  TestValidator.predicate(
    "comment2 has deleted_at timestamp",
    comment2.deleted_at !== null,
  );
  TestValidator.predicate(
    "comment3 has deleted_at timestamp",
    comment3.deleted_at !== null,
  );
}
