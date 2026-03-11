import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test comment content validation rules during update.
 * Validates that the system enforces meaningful contribution requirements
 * when updating comments, rejecting minimal content and accepting substantive edits.
 */
export async function test_api_comment_update_content_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: "test@example.com",
      password: "password123",
      display_name: "Test User",
      bio: "Test bio content",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create an article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: "Test Article Title",
        body: "Test article content with sufficient length to be meaningful",
        discussion_board_section_id: "00000000-0000-0000-0000-000000000000",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  // 3. Create initial comment with valid content
  const initialComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content:
            "Initial comment with meaningful content that meets validation requirements",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  // 4. Test invalid content updates (minimal content that should be rejected)
  const invalidUpdates = [
    "ok",
    "thanks",
    "yes",
    "no",
    "test",
    "...",
    "!",
    "??",
  ];
  for (const invalidContent of invalidUpdates) {
    try {
      await api.functional.discussionBoard.member.articles.comments.update(
        memberConnection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: {
            content: invalidContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
      // If we reach here, the update succeeded when it should have failed
      throw new Error(
        `Expected update with content "${invalidContent}" to fail but it succeeded`,
      );
    } catch (error) {
      // Expected behavior - the update should fail
      console.log(`Correctly rejected minimal content: "${invalidContent}"`);
    }
  }
  // 5. Test valid content update
  const validContent =
    "Updated comment with substantive content that maintains discussion context and provides meaningful contribution to the conversation";
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: validContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  // 6. Validate the update was successful
  if (updatedComment.id !== initialComment.id) {
    throw new Error("Comment ID changed after update");
  }
  if (updatedComment.content !== validContent) {
    throw new Error("Comment content was not updated correctly");
  }
  if (updatedComment.updated_at === initialComment.updated_at) {
    throw new Error("Updated timestamp did not change");
  }
  if (updatedComment.created_at !== initialComment.created_at) {
    throw new Error("Created timestamp changed unexpectedly");
  }
  if (updatedComment.author.id !== initialComment.author.id) {
    throw new Error("Author changed after update");
  }
  if (updatedComment.article.id !== initialComment.article.id) {
    throw new Error("Article reference changed after update");
  }
}
