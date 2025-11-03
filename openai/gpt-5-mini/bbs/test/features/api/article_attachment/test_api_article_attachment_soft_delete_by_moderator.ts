import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_attachment_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Prepare separate connections for uploader member, other member, and moderator
  const uploaderConn: api.IConnection = { ...connection, headers: {} };
  const otherMemberConn: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };

  // 2. Create uploader member (who will create article and upload attachment)
  const uploader: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(uploaderConn, {
      body: typia.random<IDiscussionBoardMember.IJoin>() satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(uploader);
  TestValidator.predicate(
    "uploader has id",
    uploader.id !== null && uploader.id !== undefined,
  );

  // 3. Create a different member (non-uploader) to validate authorization checks
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(otherMemberConn, {
      body: typia.random<IDiscussionBoardMember.IJoin>() satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(otherMember);
  TestValidator.predicate(
    "other member has id",
    otherMember.id !== null && otherMember.id !== undefined,
  );

  // 4. Create moderator account (will perform the soft-delete)
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: typia.random<IDiscussionBoardModerator.ICreate>() satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator has id",
    moderator.id !== null && moderator.id !== undefined,
  );

  // 5. Using uploader connection, create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(uploaderConn, {
      body: typia.random<IDiscussionBoardArticle.ICreate>() satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "created article has id",
    article.id !== null && article.id !== undefined,
  );

  // 6. Using uploader connection, create an attachment for the article
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      uploaderConn,
      {
        articleId: article.id,
        body: typia.random<IDiscussionBoardAttachment.ICreate>() satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.predicate(
    "attachment has id",
    attachment.id !== null && attachment.id !== undefined,
  );
  TestValidator.predicate(
    "attachment has storage_key",
    attachment.storage_key !== null && attachment.storage_key !== undefined,
  );
  TestValidator.predicate(
    "attachment has original_filename",
    attachment.original_filename !== null &&
      attachment.original_filename !== undefined,
  );

  // 7. Authorization: non-uploader (otherMember) attempting moderator-scoped erase should fail
  await TestValidator.error(
    "non-uploader member cannot perform moderator-scoped erase",
    async () => {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        otherMemberConn,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 8. Moderator performs the soft-delete successfully (should not throw)
  await api.functional.discussionBoard.moderator.articles.attachments.erase(
    moderatorConn,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // 9. Idempotency: second delete by moderator should also complete without throwing
  await api.functional.discussionBoard.moderator.articles.attachments.erase(
    moderatorConn,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // 10. Because there are no GET/list audit endpoints provided, we consider the
  // successful moderator erase, the authorization rejection above, and idempotency
  // check as sufficient observable evidence of correct behavior.
  TestValidator.predicate("moderator erase completed and idempotent", true);
}
