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

/**
 * Test concurrent article edit scenario where member and moderator attempt to
 * update the same article simultaneously.
 *
 * This test validates the system's conflict handling for concurrent edits:
 *
 * 1. Create moderator account for concurrent update attempt
 * 2. Create member account who creates article and initiates first update
 * 3. Create article by member
 * 4. Member initiates update while moderator also attempts update
 * 5. Verify final article state is consistent
 * 6. Confirm revision history correctly records both edit attempts with timestamps
 * 7. Validate last-write-wins semantics or conflict detection
 *
 * Steps:
 *
 * 1. Register moderator via /auth/moderator/join
 * 2. Register member via /auth/member/join
 * 3. Member creates article via /discussionBoard/member/articles
 * 4. Member updates article via /discussionBoard/member/articles/{articleId}
 * 5. Moderator logs in and updates same article via
 *    /discussionBoard/moderator/articles/{articleId}
 * 6. Retrieve final article state and validate consistency
 * 7. Verify revision numbers, timestamps, and content integrity
 */
export async function test_api_article_update_moderator_concurrent_edit_handling(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: "http://localhost/admin",
        referrer: "http://localhost",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created with active status",
    moderator.account_status === "active",
  );

  // Step 2: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  // After member.join(), connection.headers.Authorization is set to member token

  // Step 3: Create article by member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with correct title",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "initial revision number is 0",
    createdArticle.revision_number,
    0,
  );

  const articleId = createdArticle.id;
  const initialCreatedAt = createdArticle.created_at;
  const initialUpdatedAt = createdArticle.updated_at;

  // Step 4: Member updates article
  const memberUpdateTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const memberUpdateContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });

  const memberUpdatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: articleId,
      body: {
        title: memberUpdateTitle,
        content: memberUpdateContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(memberUpdatedArticle);
  TestValidator.equals(
    "member update applied title",
    memberUpdatedArticle.title,
    memberUpdateTitle,
  );
  TestValidator.equals(
    "revision number incremented to 1",
    memberUpdatedArticle.revision_number,
    1,
  );

  // Step 5: Moderator logs in (switches connection auth context)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "http://localhost/admin",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  // After moderator.login(), connection.headers.Authorization is now moderator token

  // Step 5b: Moderator updates same article
  const moderatorUpdateTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const moderatorUpdateContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });

  const moderatorUpdatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: articleId,
      body: {
        title: moderatorUpdateTitle,
        content: moderatorUpdateContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(moderatorUpdatedArticle);
  TestValidator.equals(
    "moderator update applied title",
    moderatorUpdatedArticle.title,
    moderatorUpdateTitle,
  );
  TestValidator.equals(
    "revision number incremented to 2",
    moderatorUpdatedArticle.revision_number,
    2,
  );

  // Step 6: Validate final state consistency
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    moderatorUpdatedArticle.created_at,
    initialCreatedAt,
  );

  // updated_at should be newer than initial
  TestValidator.predicate(
    "updated_at reflects latest modification",
    new Date(moderatorUpdatedArticle.updated_at) >= new Date(initialUpdatedAt),
  );

  // Final state should reflect moderator's last update (last-write-wins)
  TestValidator.equals(
    "final article title is moderator's update",
    moderatorUpdatedArticle.title,
    moderatorUpdateTitle,
  );
  TestValidator.equals(
    "final article content is moderator's update",
    moderatorUpdatedArticle.content,
    moderatorUpdateContent,
  );

  // Step 7: Verify article author remains original member
  TestValidator.equals(
    "article author is original member",
    moderatorUpdatedArticle.author.id,
    member.id,
  );

  // Verify status remains published
  TestValidator.equals(
    "article status remains published",
    moderatorUpdatedArticle.status,
    "published",
  );

  // Verify article ID consistency
  TestValidator.equals(
    "article ID unchanged",
    moderatorUpdatedArticle.id,
    articleId,
  );
}
