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
 * Test that updating an article preserves all existing comments on the article.
 *
 * **Setup:**
 * 1. Register admin account via authorize_admin_join for section creation
 * 2. Create a section via generate_random_discussion_board_admin_sections_create as admin
 * 3. Register first member account (Author) via authorize_member_join
 * 4. Create an article via generate_random_discussion_board_member_articles_create as the Author
 * 5. Register second member account (Commenter) via authorize_member_join
 * 6. Create multiple comments on the article via generate_random_discussion_board_member_articles_comments_create as the Commenter
 *
 * **Test Execution:**
 * 1. Call PUT /discussionBoard/member/articles/{articleId} as the Author with updated title and content
 * 2. Verify the response returns the updated article
 * 3. Verify comment count matches the number of comments created before the update
 * 4. Verify article ID and section remain unchanged after update
 *
 * **Business Logic Validation:**
 * - Article updates must not affect associated comments
 * - Comments persist through article modifications
 * - Comment count remains accurate after article update
 * - Article identity (ID, section) is preserved through update
 */
export async function test_api_article_update_preserves_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
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
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Author setup - create article
  const authorConnection: api.IConnection = { host: connection.host };
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(authorConnection, {
    body: {
      email: authorEmail,
      password: authorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Commenter setup - create multiple comments
  const commenterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(commenterConnection, {
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
  // Create multiple comments
  const commentCount = 3;
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        commenterConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Update the article as author
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      authorConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 5. Verify comments are preserved
  TestValidator.equals(
    "comment count preserved",
    updatedArticle.comments_count,
    commentCount,
  );
  TestValidator.equals("article ID unchanged", updatedArticle.id, article.id);
  TestValidator.equals(
    "section unchanged",
    updatedArticle.section.id,
    section.id,
  );
  TestValidator.notEquals("title updated", updatedArticle.title, article.title);
  TestValidator.notEquals(
    "content updated",
    updatedArticle.content,
    article.content,
  );
  // Verify comment data is accessible and valid
  for (let i = 0; i < comments.length; i++) {
    TestValidator.predicate(
      `comment ${i} has valid author`,
      comments[i].author.id !== undefined,
    );
    TestValidator.predicate(
      `comment ${i} has content`,
      comments[i].content.length > 0,
    );
  }
}
