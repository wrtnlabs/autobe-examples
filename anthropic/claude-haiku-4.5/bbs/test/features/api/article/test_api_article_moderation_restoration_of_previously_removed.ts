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
 * Test moderator's ability to restore previously removed articles.
 *
 * This test validates the complete workflow for article restoration by a
 * moderator. A moderator restores a previously removed article by changing its
 * status from 'archived' back to 'published', making it visible to users again.
 * The test ensures that the article status is properly updated and the
 * restoration action is documented.
 *
 * Test workflow:
 *
 * 1. Create a member account for article creation
 * 2. Create an article with the member account
 * 3. Create a moderator account for moderation actions
 * 4. Remove the article by moderator (change status to 'archived')
 * 5. Restore the article by moderator (change status back to 'published')
 * 6. Verify the article status is restored to 'published'
 */
export async function test_api_article_moderation_restoration_of_previously_removed(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // Step 2: Create an article with the member account
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 4,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article initial status is published",
    article.status,
    "published",
  );

  // Step 3: Create a moderator account for moderation actions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorIp = "127.0.0.1";
  const moderatorHref = "http://localhost:3000/moderator/join";
  const moderatorReferrer = "http://localhost:3000/";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123",
      ip: moderatorIp,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);

  // Step 4: Remove the article by moderator (change status to 'archived')
  const removedArticle =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          action_type: "remove",
          reason: "Violates community guidelines",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(removedArticle);
  TestValidator.equals(
    "article status after removal is archived",
    removedArticle.status,
    "archived",
  );

  // Step 5: Restore the article by moderator (change status back to 'published')
  const restoredArticle =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          action_type: "restore",
          reason: "Article review completed, content is appropriate",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(restoredArticle);

  // Step 6: Verify the article status is restored to 'published'
  TestValidator.equals(
    "article status after restoration is published",
    restoredArticle.status,
    "published",
  );
  TestValidator.equals(
    "restored article ID matches original",
    restoredArticle.id,
    article.id,
  );
}
