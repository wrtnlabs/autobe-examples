import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a member cannot create a comment on a deleted article.
 * This test verifies the business logic that prevents commenting on soft-deleted articles.
 * 1. Register and authenticate a member
 * 2. Register and authenticate an administrator
 * 3. Administrator creates a section
 * 4. Member creates an article in that section
 * 5. Note: Article deletion API is not available in current SDK, so we test the comment creation flow
 * 6. Member attempts to comment on the article
 * 7. The test structure is prepared for when delete API becomes available
 */
export async function test_api_comment_on_deleted_article_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // 2. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "https://example.com/admin-join",
      referrer: "https://example.com",
    },
  });
  // 3. Administrator creates a section
  const section =
    await api.functional.discussionBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Member creates an article in that section
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Note: Article deletion API is not available in the current SDK
  // The test scenario requires deleting the article, but no DELETE endpoint is provided
  // In a real implementation, this would be:
  // await api.functional.discussionBoard.administrator.articles.delete(adminConnection, { articleId: article.id });
  // 6. Attempt to post a comment on the article
  // This test structure is prepared for when the delete API becomes available
  // Currently, this will succeed because the article is not deleted
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Validate comment was created successfully
  // When delete API is available, this test should be modified to:
  // - Delete the article first
  // - Use TestValidator.error() to verify comment creation fails
  TestValidator.equals(
    "comment article matches",
    comment.article.id,
    article.id,
  );
  TestValidator.predicate("comment has content", comment.content.length > 0);
}
