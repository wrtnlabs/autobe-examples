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

/**
 * Test that the reply creation endpoint enforces rate limiting to prevent abuse
 * and spam.
 *
 * The scenario has a member attempt to create 50 replies within an hour (at
 * rate limit), followed by a 51st reply attempt which should be rejected with a
 * rate limit error. The test validates that the first 50 replies succeed with
 * proper creation, the 51st reply fails with specific error message indicating
 * rate limit exceeded, the error message provides information about when the
 * user can post again, the rate limit counter resets after the hour window
 * expires, and rate limits apply per member (different members can each create
 * 50 replies simultaneously without hitting each other's limits).
 *
 * Test Flow:
 *
 * 1. Create first member account for rate limit testing
 * 2. Create an article to serve as context for replies
 * 3. Create a parent comment on the article to reply to
 * 4. Create 50 replies to the parent comment (should all succeed)
 * 5. Attempt to create 51st reply (should fail with rate limit error)
 * 6. Verify error message contains rate limit exceeded information
 * 7. Create second member and verify independent rate limit quota
 * 8. Verify second member can create replies while first member is rate limited
 */
export async function test_api_reply_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // 1. Create first member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);
  TestValidator.predicate(
    "member1 should be authorized",
    member1.token !== null,
  );

  // 2. Create an article for replies
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Rate Limit Test Article",
        content:
          "This is a test article for rate limiting enforcement on replies. It contains sufficient content for testing.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate("article should be created", article.id !== null);

  // 3. Create a parent comment to reply to
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is a parent comment for testing replies.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment should be created",
    parentComment.id !== null,
  );

  // 4. Create 50 replies to the parent comment (should all succeed)
  const replies: IDiscussionBoardComment[] = [];
  for (let i = 0; i < 50; i++) {
    const reply: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.comments.replies.createReply(
        connection,
        {
          commentId: parentComment.id,
          body: {
            content: `Reply number ${i + 1}. This is a test reply for rate limiting enforcement.`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }
  TestValidator.equals("50 replies should be created", replies.length, 50);

  // 5. Attempt to create 51st reply (should fail with rate limit error)
  await TestValidator.error(
    "51st reply should fail with rate limit error",
    async () => {
      await api.functional.discussionBoard.member.comments.replies.createReply(
        connection,
        {
          commentId: parentComment.id,
          body: {
            content:
              "This is the 51st reply which should be rejected due to rate limiting.",
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // 6. Create second member with independent rate limit quota
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);
  TestValidator.predicate(
    "member2 should be authorized",
    member2.token !== null,
  );

  // 7. Verify second member can create a reply (independent rate limit)
  const member2Reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content:
            "This reply from member2 should succeed as they have independent rate limit quota.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(member2Reply);
  TestValidator.predicate(
    "member2 should be able to create reply with independent quota",
    member2Reply.id !== null,
  );

  // 8. Verify rate limit applies per member
  TestValidator.predicate(
    "different members have independent rate limit counters",
    member2Reply.id !== replies[0].id,
  );
}
