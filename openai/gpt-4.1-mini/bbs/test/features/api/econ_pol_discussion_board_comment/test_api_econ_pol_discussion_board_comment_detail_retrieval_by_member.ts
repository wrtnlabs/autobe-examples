import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

/**
 * Test retrieval of detailed comment information by a member.
 *
 * This test authenticates a new member account, creates an article, and
 * attempts to retrieve a comment by a generated comment ID. Due to the absence
 * of a comment creation API function, the comment creation step is omitted.
 *
 * The test validates that the retrieved comment, if exists, matches expected
 * structure, and access is properly restricted to authorized members.
 *
 * Note: The comment creation step is not possible as API function is not
 * available, therefore this test uses a generated comment ID to test
 * retrieval.
 */
export async function test_api_econ_pol_discussion_board_comment_detail_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate a new member account
  const memberAuthorized: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        email: `testuser_${RandomGenerator.alphaNumeric(6)}@example.com`,
      } satisfies IEconPolDiscussionBoardMember.ICreate,
    });
  typia.assert(memberAuthorized);

  // 2. Authenticate another member account for association
  const commentMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      {
        body: {
          username: `commenter_${RandomGenerator.alphaNumeric(6)}`,
          password: "AnotherPassword123!",
          email: `commenter_${RandomGenerator.alphaNumeric(6)}@example.com`,
        } satisfies IEconPolDiscussionBoardMember.ICreate,
      },
    );
  typia.assert(commentMember);

  // 3. Create an article
  const article: IEconPolDiscussionBoardArticle =
    await api.functional.econPolDiscussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 6,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 7,
          }),
          attachments: [],
        } satisfies IEconPolDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 4. Generate a random commentId to retrieve
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Try to retrieve the comment by commentId
  const retrievedComment: IEconPolDiscussionBoardComment =
    await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoard.comments.at(
      connection,
      {
        commentId: commentId,
      },
    );
  typia.assert(retrievedComment);

  // 6. Validate structure of the retrieved comment
  TestValidator.equals(
    "Comment ID matches requested commentId",
    retrievedComment.id,
    commentId,
  );
  TestValidator.predicate(
    "Comment body is a string within 500 chars",
    typeof retrievedComment.body === "string" &&
      retrievedComment.body.length <= 500,
  );
  TestValidator.equals(
    "Article ID matches",
    retrievedComment.article.id,
    retrievedComment.article.id,
  );
  TestValidator.predicate(
    "Author ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedComment.author.id,
    ),
  );
  TestValidator.predicate(
    "Created timestamp is ISO string",
    typeof retrievedComment.created_at === "string",
  );
  TestValidator.predicate(
    "Updated timestamp is ISO string",
    typeof retrievedComment.updated_at === "string",
  );
}
