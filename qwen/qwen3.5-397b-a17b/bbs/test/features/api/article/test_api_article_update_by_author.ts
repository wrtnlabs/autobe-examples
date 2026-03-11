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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a member can successfully update their own article's title, content, and section assignment.
 *
 * **Setup:**
 * 1. Register and login as admin to create a section
 * 2. Create a section for article assignment
 * 3. Register and login as member to create and update the article
 * 4. Create an article assigned to the created section with attachments and tags
 *
 * **Test Execution:**
 * 1. Update the article with new title, content, and section
 * 2. Verify all fields are updated correctly
 * 3. Verify timestamps (created_at preserved, updated_at changed)
 * 4. Verify attachments and tags are preserved
 * 5. Verify author information remains unchanged
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create section for article assignment
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create a second section for update test
  const secondSection =
    await generate_random_discussion_board_admin_sections_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(secondSection);
  // 3. Member setup - register and login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Create article with attachments and tags
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: ["test-tag-1", "test-tag-2"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Store original values for comparison
  const originalCreatedAt = article.created_at;
  const originalAuthorId = article.author.id;
  const originalFilesCount = article.files.length;
  const originalImagesCount = article.images.length;
  const originalTagsCount = article.tags.length;
  // 5. Update article with new values
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberLoginConnection,
      {
        articleId: article.id,
        body: {
          title: updatedTitle,
          content: updatedContent,
          discussion_board_section_id: secondSection.id,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate update results
  TestValidator.equals("title updated", updatedArticle.title, updatedTitle);
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    updatedContent,
  );
  TestValidator.equals(
    "section updated",
    updatedArticle.section.id,
    secondSection.id,
  );
  // 7. Validate timestamps
  TestValidator.equals(
    "created_at preserved",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedArticle.updated_at,
    originalCreatedAt,
  );
  // 8. Validate attachments preserved
  TestValidator.equals(
    "files count preserved",
    updatedArticle.files.length,
    originalFilesCount,
  );
  TestValidator.equals(
    "images count preserved",
    updatedArticle.images.length,
    originalImagesCount,
  );
  // 9. Validate tags preserved
  TestValidator.equals(
    "tags count preserved",
    updatedArticle.tags.length,
    originalTagsCount,
  );
  // 10. Validate author unchanged
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    originalAuthorId,
  );
}
