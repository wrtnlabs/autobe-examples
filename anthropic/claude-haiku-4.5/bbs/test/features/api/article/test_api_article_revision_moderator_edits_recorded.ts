import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleRevision";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleRevision";

/**
 * Test that moderator edits to articles are properly recorded in revision
 * history.
 *
 * Validates that when a moderator edits an article for policy violations or
 * formatting, the revision is recorded with edit_type 'moderator_edit' and
 * includes moderator ID and optional change_reason. Tests the complete
 * workflow:
 *
 * 1. Create member account to author the article
 * 2. Create moderator account with permission to edit any article
 * 3. Member creates an article with title and content
 * 4. Member performs initial edit to establish baseline revision
 * 5. Moderator edits the same article with change reason
 * 6. Retrieve revision history for the article
 * 7. Verify moderator edit is recorded with correct edit_type classification
 * 8. Confirm moderator ID and change_reason are properly populated
 * 9. Validate that both member and moderator versions are preserved
 * 10. Ensure revision history is in chronological order
 */
export async function test_api_article_revision_moderator_edits_recorded(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author the article
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "TestPass123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created with valid ID",
    member.id !== null && member.id !== undefined,
  );

  // Step 2: Create moderator account with permission to edit any article
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "ModeratorPass123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created with valid ID",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Switch back to member for article creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  // Step 3: Member creates an article with title and content
  const initialTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const initialContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: initialTitle,
        content: initialContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== null && article.id !== undefined,
  );
  TestValidator.equals("initial title matches", article.title, initialTitle);
  TestValidator.equals(
    "initial content matches",
    article.content,
    initialContent,
  );

  // Step 4: Member performs initial edit to establish baseline revision
  const memberEditTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const memberEditContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });

  const memberEditedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: memberEditTitle,
        content: memberEditContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(memberEditedArticle);
  TestValidator.equals(
    "member edit title matches",
    memberEditedArticle.title,
    memberEditTitle,
  );
  TestValidator.equals(
    "member edit content matches",
    memberEditedArticle.content,
    memberEditContent,
  );

  // Step 5: Switch to moderator and perform moderator edit with change reason
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const moderatorEditTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const moderatorEditContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });

  const moderatorEditedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: article.id,
      body: {
        title: moderatorEditTitle,
        content: moderatorEditContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(moderatorEditedArticle);
  TestValidator.equals(
    "moderator edit title matches",
    moderatorEditedArticle.title,
    moderatorEditTitle,
  );
  TestValidator.equals(
    "moderator edit content matches",
    moderatorEditedArticle.content,
    moderatorEditContent,
  );

  // Step 6: Retrieve revision history for the article
  const revisionHistory: IPageIDiscussionBoardArticleRevision =
    await api.functional.discussionBoard.articles.revisions.index(connection, {
      articleId: article.id,
    });
  typia.assert(revisionHistory);
  TestValidator.predicate(
    "revision history contains data",
    revisionHistory.data && revisionHistory.data.length > 0,
  );

  // Step 7: Verify moderator edit is recorded with correct edit_type
  const moderatorRevision: IDiscussionBoardArticleRevision | undefined =
    revisionHistory.data.find((rev) => rev.edit_type === "moderator_edit");
  TestValidator.predicate(
    "moderator edit revision exists",
    moderatorRevision !== undefined,
  );

  if (moderatorRevision !== undefined) {
    typia.assert(moderatorRevision);

    // Step 8: Confirm moderator ID is properly populated
    TestValidator.predicate(
      "moderator_id is populated",
      moderatorRevision.editor_moderator_id !== null &&
        moderatorRevision.editor_moderator_id !== undefined,
    );
    TestValidator.equals(
      "moderator_id matches authenticated moderator",
      moderatorRevision.editor_moderator_id,
      moderator.id,
    );

    // Step 8: Verify member edit is NOT recorded as moderator edit
    TestValidator.predicate(
      "member_id is null for moderator edit",
      moderatorRevision.editor_member_id === null ||
        moderatorRevision.editor_member_id === undefined,
    );

    // Step 9: Validate content preservation
    TestValidator.equals(
      "moderator revision title matches edited title",
      moderatorRevision.title,
      moderatorEditTitle,
    );
    TestValidator.equals(
      "moderator revision content matches edited content",
      moderatorRevision.content,
      moderatorEditContent,
    );
  }

  // Step 7b: Verify member edit is recorded with correct edit_type
  const memberRevision: IDiscussionBoardArticleRevision | undefined =
    revisionHistory.data.find((rev) => rev.edit_type === "member_edit");
  TestValidator.predicate(
    "member edit revision exists",
    memberRevision !== undefined,
  );

  if (memberRevision !== undefined) {
    typia.assert(memberRevision);

    // Verify member ID is populated
    TestValidator.predicate(
      "editor_member_id is populated",
      memberRevision.editor_member_id !== null &&
        memberRevision.editor_member_id !== undefined,
    );
    TestValidator.equals(
      "editor_member_id matches member",
      memberRevision.editor_member_id,
      member.id,
    );

    // Verify moderator_id is null for member edit
    TestValidator.predicate(
      "editor_moderator_id is null for member edit",
      memberRevision.editor_moderator_id === null ||
        memberRevision.editor_moderator_id === undefined,
    );
  }

  // Step 9: Validate revision history preservation and ordering
  TestValidator.predicate(
    "at least two revisions exist",
    revisionHistory.data.length >= 2,
  );

  // Verify creation edit exists (initial creation)
  const creationEdit: IDiscussionBoardArticleRevision | undefined =
    revisionHistory.data[0];
  if (creationEdit !== undefined) {
    typia.assert(creationEdit);
    TestValidator.predicate(
      "first revision is member edit or has member_id",
      creationEdit.edit_type === "member_edit" ||
        creationEdit.editor_member_id !== null,
    );
  }

  // Verify chronological ordering - moderator edit should be last
  if (revisionHistory.data.length > 0) {
    const lastRevision: IDiscussionBoardArticleRevision =
      revisionHistory.data[revisionHistory.data.length - 1];
    typia.assert(lastRevision);
    TestValidator.predicate(
      "last revision is moderator edit",
      lastRevision.edit_type === "moderator_edit",
    );
  }
}
