import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test that an administrator can update a comment authored by another member.
 *
 * This test validates the admin content moderation authority where administrators
 * have the capability to modify any comment regardless of authorship. The test
 * verifies that:
 * - The admin can successfully update the comment content
 * - The system preserves the original author information in the response
 * - The updated_at timestamp is correctly modified
 *
 * Test workflow:
 * 1. Admin joins (adminConnection with auth token)
 * 2. Admin creates a discussion board section
 * 3. Member joins (memberConnection with auth token)
 * 4. Member creates an article in the section
 * 5. Member creates a comment on the article
 * 6. Admin updates the comment using adminConnection
 * 7. Validate: comment content is updated, original author preserved, updated_at changed
 */
export async function test_api_comment_update_by_admin_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join (automatically authenticates)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin creates a discussion board section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member setup - join (automatically authenticates)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Member creates a comment on the article
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: originalContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store original author info and timestamp
  const originalAuthorId = comment.member.id;
  const originalAuthorName = comment.member.display_name;
  const originalCreatedAt = comment.created_at;
  const originalUpdatedAt = comment.updated_at;
  // 6. Admin updates the comment
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.discussionBoard.admin.articles.comments.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. Validate results
  // Content should be updated
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    newContent,
  );
  // Original author should be preserved
  TestValidator.equals(
    "original author ID preserved",
    updatedComment.member.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "original author name preserved",
    updatedComment.member.display_name,
    originalAuthorName,
  );
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // updated_at should be modified (later than original)
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedComment.updated_at) > new Date(originalUpdatedAt),
  );
  // Article reference should be preserved
  TestValidator.equals(
    "article ID preserved",
    updatedComment.article.id,
    article.id,
  );
}
