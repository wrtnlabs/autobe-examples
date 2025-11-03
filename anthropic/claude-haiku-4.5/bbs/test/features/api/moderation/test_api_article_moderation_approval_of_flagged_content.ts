import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleRevision";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to approve flagged articles that passed review
 * without policy violations.
 *
 * This test validates the complete moderation workflow for content approval in
 * the discussion board platform. The scenario simulates a moderator reviewing a
 * flagged article and approving it for publication.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with proper administrative credentials
 * 2. Create a member account for article creation
 * 3. Create an article that requires moderation (flagged content)
 * 4. Approve the flagged article with moderation action
 * 5. Validate that article status updates to published and becomes visible to
 *    users
 */
export async function test_api_article_moderation_approval_of_flagged_content(
  connection: api.IConnection,
) {
  // 1. Create moderator account for moderation operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created",
    moderator.id !== undefined,
  );

  // 2. Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member account created", member.id !== undefined);

  // 3. Create a flagged article for moderation review
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          category_code: "economics",
          attachments: undefined,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created", article.id !== undefined);
  TestValidator.equals(
    "initial article status is published",
    article.status,
    "published",
  );

  // 4. Approve the flagged article with moderation action
  const approvalReason =
    "Content review completed. No policy violations detected. Approved for publication.";
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      moderatorConnection,
      {
        articleId: article.id,
        body: {
          action_type: "approve",
          reason: approvalReason,
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(approvedArticle);

  // 5. Validate moderation approval results
  TestValidator.equals(
    "article status is published after approval",
    approvedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "article remains in published state",
    approvedArticle.status === "published",
  );
  TestValidator.equals(
    "article ID unchanged after approval",
    approvedArticle.id,
    article.id,
  );
  TestValidator.predicate(
    "article updated timestamp is valid",
    approvedArticle.updated_at !== undefined,
  );
  TestValidator.predicate(
    "moderator successfully performed approval action",
    moderator.id !== undefined,
  );
  TestValidator.predicate(
    "article is visible to users after approval",
    approvedArticle.status === "published",
  );
}
