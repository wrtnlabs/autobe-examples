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

export async function test_api_article_update_authorization_only_author_or_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register Member A (article author)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberA);

  // Step 2: Member A creates an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);
  TestValidator.equals("article author matches", article.author.id, memberA.id);

  // Step 3: Register Member B (unauthorized updater)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberB);

  // Step 4: Member B attempts to update Member A's article (should fail)
  const unauthorizedUpdateData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  await TestValidator.error(
    "non-author member cannot update article",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: article.id,
        body: unauthorizedUpdateData,
      });
    },
  );

  // Step 5: Register Moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorIp = "127.0.0.1";
  const moderatorHref = "http://localhost:3000/admin/register";
  const moderatorReferrer = "http://localhost:3000/admin";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: moderatorIp,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator has permissions",
    moderator.permissions.length > 0,
  );

  // Step 6: Moderator updates Member A's article (should succeed)
  const moderatorUpdateData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: moderatorUpdateData,
    });
  typia.assert(updatedArticle);
  TestValidator.equals(
    "moderator update reflects new title",
    updatedArticle.title,
    moderatorUpdateData.title,
  );
  TestValidator.equals(
    "moderator update reflects new content",
    updatedArticle.content,
    moderatorUpdateData.content,
  );

  // Step 7: Re-authenticate as Member A and verify author can update their own article
  const memberAReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAReauth);

  const authorUpdateData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const authorUpdatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: authorUpdateData,
    });
  typia.assert(authorUpdatedArticle);
  TestValidator.equals(
    "author update reflects new title",
    authorUpdatedArticle.title,
    authorUpdateData.title,
  );
}
