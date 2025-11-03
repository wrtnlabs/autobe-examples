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

export async function test_api_attachment_retrieval_archived_article_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Test123456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create article with attachments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
        attachments: [
          {
            filename: "document.pdf",
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 102400,
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        ],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.predicate(
    "article has attachments",
    () => article.attachments !== undefined && article.attachments.length > 0,
  );

  const attachmentId = article.attachments![0].id;

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModTest123456",
        ip: "127.0.0.1",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);

  // Step 4: Archive the article
  const archivedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.moderation.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          action_type: "remove",
          reason: "Testing archive restriction",
        } satisfies IDiscussionBoardArticleRevision.IUpdate,
      },
    );
  typia.assert(archivedArticle);
  TestValidator.equals(
    "article status is archived",
    archivedArticle.status,
    "archived",
  );

  // Step 5: Create second member account (guest/regular member)
  const guestMemberEmail = typia.random<string & tags.Format<"email">>();
  const guestMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: guestMemberEmail,
        password: "Guest123456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(guestMember);

  // Step 6: Verify guest member cannot retrieve attachment from archived article
  await TestValidator.error(
    "guest member cannot retrieve attachment from archived article",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(connection, {
        articleId: article.id,
        attachmentId: attachmentId,
      });
    },
  );

  // Step 7: Authenticate as moderator and verify moderator can retrieve attachment from archived article
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModTest123456",
      ip: "127.0.0.1",
      href: "http://localhost:3000/auth/moderator/join",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.IJoin,
  });

  const retrievedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: attachmentId,
    });
  typia.assert(retrievedAttachment);
  TestValidator.equals(
    "retrieved attachment ID matches",
    retrievedAttachment.id,
    attachmentId,
  );
  TestValidator.equals(
    "attachment security status is safe",
    retrievedAttachment.security_status,
    "safe",
  );
}
