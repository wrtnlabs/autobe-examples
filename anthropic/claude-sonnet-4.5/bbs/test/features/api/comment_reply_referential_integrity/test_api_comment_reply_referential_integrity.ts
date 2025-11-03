import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_comment_reply_referential_integrity(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a moderator account to create the category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create a category for the article
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: typia.random<string & tags.MaxLength<2000>>(),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Re-authenticate as member to create articles and comments
  // Note: Using join again with the same credentials to re-establish member session
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberReauth);

  // Step 5: Create the first article
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Step 6: Create a second article (to test cross-article comment scenario)
  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Step 7: Create a valid comment on article1
  const validComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article1.id,
        body: {
          discussion_board_article_id: article1.id,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<5000>
          >(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(validComment);

  // Step 8: Create a comment on article2 (to test wrong article scenario)
  const commentOnArticle2 =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article2.id,
        body: {
          discussion_board_article_id: article2.id,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<5000>
          >(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentOnArticle2);

  // Test Scenario 1: Attempt to create a reply with a non-existent commentId
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject reply to non-existent comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.replies.create(
        connection,
        {
          articleId: article1.id,
          commentId: nonExistentCommentId,
          body: {
            discussion_board_article_id: article1.id,
            discussion_board_parent_comment_id: nonExistentCommentId,
            content: typia.random<
              string & tags.MinLength<1> & tags.MaxLength<5000>
            >(),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Test Scenario 2: Attempt to create a reply to a comment from a different article
  await TestValidator.error(
    "should reject reply to comment from different article",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.replies.create(
        connection,
        {
          articleId: article1.id,
          commentId: commentOnArticle2.id,
          body: {
            discussion_board_article_id: article1.id,
            discussion_board_parent_comment_id: commentOnArticle2.id,
            content: typia.random<
              string & tags.MinLength<1> & tags.MaxLength<5000>
            >(),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Note: Test Scenario 3 (soft-deleted comment) cannot be implemented
  // because no delete endpoint is available in the provided API functions.
  // The system's referential integrity validation for soft-deleted comments
  // cannot be tested without a way to soft-delete a comment first.
}
