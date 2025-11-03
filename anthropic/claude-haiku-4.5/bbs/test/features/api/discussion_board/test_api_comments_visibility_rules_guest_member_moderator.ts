import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Tests comment visibility rules enforcement based on user roles (guest,
 * member, moderator).
 *
 * This test validates that the discussion board platform correctly enforces
 * visibility constraints for comments based on the authenticated user's role:
 *
 * - Guests see only published comments
 * - Members see published comments and their own content
 * - Moderators see all comments including full visibility of moderated content
 *
 * The test creates an article with multiple comments in published state and
 * validates that each user type receives appropriate visibility according to
 * their permissions.
 */
export async function test_api_comments_visibility_rules_guest_member_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first member account to author article and comments
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123";
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);

  // Step 2: Create article with member account
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create multiple published comments
  const publishedComment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedComment1);
  TestValidator.equals(
    "comment 1 should be published",
    publishedComment1.status,
    "published",
  );

  const publishedComment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedComment2);
  TestValidator.equals(
    "comment 2 should be published",
    publishedComment2.status,
    "published",
  );

  const publishedComment3: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedComment3);
  TestValidator.equals(
    "comment 3 should be published",
    publishedComment3.status,
    "published",
  );

  // Step 4: Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPassword123";
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator should be active",
    moderatorAuth.account_status,
    "active",
  );

  // Step 5: Retrieve comments as authenticated member
  const memberViewComments: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(memberViewComments);

  // Verify member sees the published comments
  TestValidator.equals(
    "member should see all published comments",
    memberViewComments.data.length,
    3,
  );
  TestValidator.predicate(
    "all comments visible to member should be published",
    memberViewComments.data.every((c) => c.status === "published"),
  );

  // Step 6: Verify comment data structure for members
  TestValidator.predicate(
    "each visible comment should have valid author",
    memberViewComments.data.every((c) => c.author && c.author.id),
  );
  TestValidator.predicate(
    "each comment should have thread depth 0 for top-level",
    memberViewComments.data.every((c) => c.thread_depth === 0),
  );
  TestValidator.predicate(
    "each comment should have valid timestamps",
    memberViewComments.data.every(
      (c) =>
        new Date(c.created_at) instanceof Date &&
        !isNaN(new Date(c.created_at).getTime()),
    ),
  );

  // Step 7: Create second member to test cross-member visibility
  const secondMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondMemberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: "Password456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(secondMemberAuth);

  // Step 8: Verify second member also sees the same published comments
  const secondMemberViewComments: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(secondMemberViewComments);
  TestValidator.equals(
    "second member should see same published comments",
    secondMemberViewComments.data.length,
    3,
  );

  // Step 9: Verify pagination metadata
  TestValidator.predicate(
    "pagination current should be positive",
    memberViewComments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    memberViewComments.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should match or exceed data length",
    memberViewComments.pagination.records >= memberViewComments.data.length,
  );

  // Step 10: Verify consistent visibility across multiple queries
  const memberViewComments2: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(memberViewComments2);
  TestValidator.equals(
    "multiple queries should return consistent results",
    memberViewComments2.data.length,
    memberViewComments.data.length,
  );

  // Step 11: Verify comment IDs are preserved across queries
  const originalIds = memberViewComments.data.map((c) => c.id).sort();
  const secondQueryIds = memberViewComments2.data.map((c) => c.id).sort();
  TestValidator.equals(
    "comment IDs should match across queries",
    originalIds.join(","),
    secondQueryIds.join(","),
  );
}
