import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_comment_update_content_length_validation(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphabets(8);
  const contributorPassword = "Test@1234Pass";

  const contributorData = {
    email: contributorEmail,
    username: contributorUsername,
    password: contributorPassword,
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorData,
    });
  typia.assert(contributor);

  // 2. Create article draft (use a valid UUID as categoryId - system should have default categories)
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      { body: articleData },
    );
  typia.assert(article);

  // 3. Create and authenticate moderator to publish article
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = "Test@1234Pass";

  const moderatorData = {
    email: moderatorEmail,
    username: moderatorUsername,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Approve article for publication
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Approved for publication",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // Switch back to contributor for commenting
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // 4. Create initial comment
  const initialCommentData = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const initialComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: initialCommentData,
      },
    );
  typia.assert(initialComment);

  // 5. Test update with empty content (0 characters) - should fail
  await TestValidator.error(
    "update with empty content should fail with validation error",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: {
            content: "",
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );

  // 6. Test update with oversized content (5001 characters) - should fail
  const oversizedContent = RandomGenerator.alphabets(5001);
  await TestValidator.error(
    "update with 5001 characters should fail with validation error",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: {
            content: oversizedContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );

  // 7. Test update with minimum valid length (1 character) - should succeed
  const minimalContent = "A";
  const minimalUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: minimalContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(minimalUpdate);
  TestValidator.equals(
    "updated comment content should equal minimal 1-character input",
    minimalUpdate.content,
    minimalContent,
  );

  // 8. Test update with maximum valid length (5000 characters) - should succeed
  const maximalContent = RandomGenerator.alphabets(5000);
  const maximalUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: maximalContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(maximalUpdate);
  TestValidator.equals(
    "updated comment content should equal maximal 5000-character input",
    maximalUpdate.content,
    maximalContent,
  );
  TestValidator.predicate(
    "maximal update content length should be exactly 5000 characters",
    maximalUpdate.content.length === 5000,
  );
}
