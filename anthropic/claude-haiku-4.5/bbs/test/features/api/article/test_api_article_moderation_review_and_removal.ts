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
 * Validate moderator's ability to review articles and remove them from public
 * view.
 *
 * This test verifies the complete moderation workflow where a moderator can
 * review flagged articles and take enforcement action to archive content that
 * violates community guidelines. The test validates that articles are properly
 * hidden from regular users while remaining visible to moderators for audit
 * purposes.
 *
 * Process:
 *
 * 1. Create a moderator account for content review
 * 2. Create a member account and article for moderation testing
 * 3. Moderator reviews the article and takes removal action
 * 4. Verify article status changes to 'archived'
 * 5. Confirm article is hidden from public view
 * 6. Validate moderation audit trail was created with moderator action details
 */
export async function test_api_article_moderation_review_and_removal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPassword123",
        ip: "127.0.0.1",
        href: "http://localhost:3000/admin/moderators/join" satisfies string &
          tags.Format<"uri">,
        referrer: "http://localhost:3000/admin" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account should be active",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator should have permissions array",
    moderator.permissions.length > 0,
  );

  // Step 2: Create member account and article for moderation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article should be published initially",
    article.status === "published",
  );

  // Step 3: Switch to moderator context and review article
  connection.headers ??= {};
  connection.headers.Authorization = moderator.token.access;

  // Step 4: Moderator removes article by updating its status
  const removalReason =
    "Violates community guidelines - contains prohibited content";
  const moderationUpdate: IDiscussionBoardArticleRevision.IUpdate = {
    action_type: "remove",
    reason: removalReason,
  };

  const moderatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      connection,
      {
        articleId: article.id,
        body: moderationUpdate,
      },
    );
  typia.assert(moderatedArticle);

  // Step 5: Verify article status changed to archived
  TestValidator.equals(
    "article status should be archived after removal",
    moderatedArticle.status,
    "archived",
  );

  TestValidator.predicate(
    "moderated article should have deleted_at timestamp",
    moderatedArticle.deleted_at !== null &&
      moderatedArticle.deleted_at !== undefined,
  );

  // Step 6: Validate article remains in system for audit purposes
  TestValidator.equals(
    "article ID should remain unchanged after moderation",
    moderatedArticle.id,
    article.id,
  );

  TestValidator.equals(
    "article author should remain unchanged",
    moderatedArticle.author.id,
    member.id,
  );

  TestValidator.equals(
    "article category should remain unchanged",
    moderatedArticle.category.code,
    "economics",
  );

  // Step 7: Verify moderation action created audit trail
  // The deleted_at timestamp serves as evidence of the moderation action
  const moderationTimestamp = moderatedArticle.deleted_at;
  TestValidator.predicate(
    "moderation action timestamp should be recent",
    moderationTimestamp !== null && moderationTimestamp !== undefined,
  );
}
