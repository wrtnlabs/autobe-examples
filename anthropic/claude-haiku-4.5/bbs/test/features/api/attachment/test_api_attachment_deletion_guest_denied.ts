import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that unauthenticated guests cannot delete attachments.
 *
 * Validates that attachment deletion requires authentication. An authenticated
 * member creates an article with an attachment. An unauthenticated guest then
 * attempts to delete the attachment. The operation must be denied with 401
 * Unauthorized.
 *
 * This ensures that:
 *
 * 1. Only authenticated members can delete attachments
 * 2. Guest users are properly blocked from deletion operations
 * 3. Authentication is enforced for write operations on attachments
 */
export async function test_api_attachment_deletion_guest_denied(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234"; // Valid password: 8+ chars, uppercase, lowercase, digit

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  TestValidator.equals(
    "member authenticated",
    typeof member.token.access,
    "string",
  );

  // Step 2: Create an article with an attachment
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals("article created", typeof article.id, "string");

  // Step 3: Add an attachment to the article
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test-document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 1024,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals("attachment created", typeof attachment.id, "string");

  // Step 4: Create an unauthenticated connection (guest)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Attempt to delete attachment as guest (should fail with 401)
  await TestValidator.error("guest cannot delete attachment", async () => {
    await api.functional.discussionBoard.member.articles.attachments.erase(
      guestConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  });
}
