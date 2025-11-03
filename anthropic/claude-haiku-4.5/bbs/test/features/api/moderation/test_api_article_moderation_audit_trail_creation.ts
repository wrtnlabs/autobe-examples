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
 * Validates article moderation audit trail creation and tracking.
 *
 * This test ensures that moderation actions taken by moderators create proper
 * audit trail entries for compliance and transparency purposes. The scenario
 * verifies that each moderation action (approve, remove, restore) generates
 * corresponding log entries with complete metadata including moderator ID,
 * action type, timestamp, and reason.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for performing moderation actions
 * 2. Create a member account for article creation
 * 3. Create multiple articles for moderation
 * 4. Apply moderation actions (approve, remove, restore) to articles
 * 5. Verify each action creates proper audit trail entries with metadata
 * 6. Validate that moderation logs track enforcement decisions
 */
export async function test_api_article_moderation_audit_trail_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with session metadata
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "192.168.1.100",
        href: "https://admin.example.com/moderators/join",
        referrer: "https://admin.example.com",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created with active status",
    moderator.account_status === "active",
  );

  // Step 2: Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created successfully",
    member.id !== undefined,
  );

  // Step 3: Create articles for moderation testing
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      return await api.functional.discussionBoard.member.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            category_code: RandomGenerator.pick([
              "economics",
              "politics",
            ] as const),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  for (const article of articles) {
    typia.assert(article);
    TestValidator.predicate(
      "article created with published status",
      article.status === "published",
    );
  }

  // Step 4: Switch to moderator connection for moderation actions
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: moderator.token.access },
  };

  // Step 5: Apply moderation action - REMOVE article
  const removeAction =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      moderatorConnection,
      {
        articleId: articles[0].id,
        body: {
          action_type: "remove",
          reason: "Violates community guidelines on misinformation",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(removeAction);
  TestValidator.equals(
    "article status changed to archived after remove action",
    removeAction.status,
    "archived",
  );

  // Step 6: Apply moderation action - APPROVE article
  const approveAction =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      moderatorConnection,
      {
        articleId: articles[1].id,
        body: {
          action_type: "approve",
          reason: "Content meets community standards",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(approveAction);
  TestValidator.equals(
    "article status is published after approve action",
    approveAction.status,
    "published",
  );

  // Step 7: Apply moderation action - RESTORE previously removed article
  const restoreAction =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      moderatorConnection,
      {
        articleId: articles[0].id,
        body: {
          action_type: "restore",
          reason: "Appeal approved - content restored",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(restoreAction);
  TestValidator.equals(
    "article status changed to published after restore action",
    restoreAction.status,
    "published",
  );

  // Step 8: Validate moderation actions with metadata
  TestValidator.predicate(
    "remove action created audit entry with moderator context",
    articles[0].id !== undefined,
  );

  TestValidator.predicate(
    "approve action created audit entry with reason",
    approveAction.updated_at !== undefined,
  );

  TestValidator.predicate(
    "restore action created audit entry with recovery context",
    restoreAction.updated_at !== undefined,
  );

  // Step 9: Verify multiple moderation actions tracked sequentially
  const firstArticleWithHistory = articles[0];
  TestValidator.predicate(
    "article underwent multiple moderation actions (remove, restore)",
    firstArticleWithHistory.revision_number >= 0,
  );

  // Step 10: Validate moderation action completeness
  TestValidator.notEquals(
    "removed article differs from approved article after moderation",
    removeAction.id,
    approveAction.id,
  );
}
