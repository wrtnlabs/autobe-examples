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
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserViolation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test moderator's ability to search and retrieve flagged comments for content
 * review.
 *
 * This test validates the moderation content endpoint by:
 *
 * 1. Creating a moderator account for access to moderation features
 * 2. Creating a member account for authoring test content
 * 3. Creating an article with substantive discussion content
 * 4. Creating multiple comments on the article
 * 5. Retrieving flagged/published comments via the moderation endpoint
 * 6. Validating response structure with proper pagination and content details
 * 7. Testing filter parameters for content type and status
 * 8. Verifying comment details including author info, thread structure, and
 *    engagement metrics
 *
 * The test ensures moderators can efficiently review community content through
 * comprehensive filtering and structured presentation of articles, comments,
 * and user information.
 */
export async function test_api_moderation_content_review_retrieve_flagged_comments(
  connection: api.IConnection,
) {
  // 1. Create fresh connection for member signup
  const memberConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Create member account for content authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member account created", member.id !== null);

  // 3. Create article with substantive content for discussion
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 7,
          }),
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // 4. Create multiple comments on the article
  const commentIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 6,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    commentIds.push(comment.id);
  }
  TestValidator.predicate("three comments created", commentIds.length === 3);

  // 5. Create moderator account for moderation access
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator account created", moderator.id !== null);

  // 6. Retrieve flagged comments via moderation endpoint using moderator connection
  const moderationResponse: IPageIDiscussionBoardModerationLog.IContent =
    await api.functional.discussionBoard.moderator.moderation.content.index(
      moderatorConnection,
      {
        body: {
          filter_type: "comment",
          status_filter: "published",
          sort_by: "priority",
          page: 1,
          page_size: 20,
        } satisfies IDiscussionBoardModerationLog.IContentRequest,
      },
    );
  typia.assert(moderationResponse);

  // 7. Validate response structure
  TestValidator.predicate(
    "pagination object exists",
    moderationResponse.pagination !== null,
  );
  TestValidator.predicate(
    "current page is 1",
    moderationResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit is 20",
    moderationResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records count exists",
    moderationResponse.pagination.records >= 0,
  );

  // 8. Validate moderation content data structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(moderationResponse.data),
  );
  if (moderationResponse.data.length > 0) {
    const moderationContent = moderationResponse.data[0];
    typia.assert(moderationContent);

    // 9. Validate comments in response
    TestValidator.predicate(
      "comments array exists",
      Array.isArray(moderationContent.comments),
    );
    if (moderationContent.comments.length > 0) {
      const comment = moderationContent.comments[0];
      TestValidator.predicate("comment has id", comment.id !== null);
      TestValidator.predicate("comment has content", comment.content !== null);
      TestValidator.predicate("comment has status", comment.status !== null);
      TestValidator.predicate("comment has author", comment.authorId !== null);
      TestValidator.predicate(
        "comment has article reference",
        comment.articleId !== null,
      );
      TestValidator.predicate(
        "comment has thread depth",
        comment.threadDepth >= 0,
      );
      TestValidator.predicate(
        "comment has reply count",
        comment.replyCount >= 0,
      );
      TestValidator.predicate(
        "comment has created timestamp",
        comment.createdAt !== null,
      );
    }

    // 10. Validate articles in response
    TestValidator.predicate(
      "articles array exists",
      Array.isArray(moderationContent.articles),
    );

    // 11. Validate users in response
    TestValidator.predicate(
      "users array exists",
      Array.isArray(moderationContent.users),
    );
  }

  // 12. Test alternative filter parameters - retrieve all content types
  const allContentResponse: IPageIDiscussionBoardModerationLog.IContent =
    await api.functional.discussionBoard.moderator.moderation.content.index(
      moderatorConnection,
      {
        body: {
          filter_type: "all",
          status_filter: "all",
          sort_by: "created_date",
          page: 1,
          page_size: 10,
        } satisfies IDiscussionBoardModerationLog.IContentRequest,
      },
    );
  typia.assert(allContentResponse);
  TestValidator.predicate(
    "all content response has data",
    Array.isArray(allContentResponse.data),
  );

  // 13. Test article filter type
  const articleFilterResponse: IPageIDiscussionBoardModerationLog.IContent =
    await api.functional.discussionBoard.moderator.moderation.content.index(
      moderatorConnection,
      {
        body: {
          filter_type: "article",
          status_filter: "published",
          sort_by: "view_count",
          page: 1,
          page_size: 15,
        } satisfies IDiscussionBoardModerationLog.IContentRequest,
      },
    );
  typia.assert(articleFilterResponse);
  TestValidator.predicate(
    "article filter response valid",
    articleFilterResponse.pagination.current === 1,
  );
}
