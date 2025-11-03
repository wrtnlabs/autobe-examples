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
 * Test that the security status endpoint correctly identifies and reports
 * infected attachments that have failed malware scanning. This scenario creates
 * an article, uploads a file that simulates infection detection, and verifies
 * the security_status is set to 'infected' with appropriate malware_scan_result
 * details.
 *
 * Workflow:
 *
 * 1. Register a new member to authenticate for article and attachment operations
 * 2. Create an article with proper title, content, and category
 * 3. Upload an attachment file to the article that will be flagged as infected
 * 4. Verify the attachment is created and retrieve its ID
 * 5. Query the security status endpoint for the attachment
 * 6. Validate that security_status is 'infected' and malware_scan_result contains
 *    threat details
 */
export async function test_api_attachment_security_status_infected_file_detection(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member authenticated", member.id !== undefined);

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate("article created", article.id !== undefined);

  // Step 3: Upload an attachment that will be detected as infected
  const infectedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "malware-test.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 2048,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(infectedAttachment);
  TestValidator.predicate(
    "attachment uploaded",
    infectedAttachment.id !== undefined,
  );

  // Step 4: Retrieve the security status of the attachment
  const securityStatus: IDiscussionBoardAttachment.ISecurityStatus =
    await api.functional.discussionBoard.member.attachments.security_status.at(
      connection,
      {
        attachmentId: infectedAttachment.id,
      },
    );
  typia.assert(securityStatus);

  // Step 5: Validate that the attachment is flagged as infected
  TestValidator.equals(
    "security status is infected",
    securityStatus.security_status,
    "infected",
  );

  // Step 6: Validate malware scan result contains threat information
  TestValidator.predicate(
    "malware scan result contains threat details",
    securityStatus.malware_scan_result !== undefined &&
      securityStatus.malware_scan_result !== null &&
      securityStatus.malware_scan_result.length > 0,
  );

  TestValidator.equals(
    "attachment filename matches",
    securityStatus.filename,
    "malware-test.pdf",
  );

  TestValidator.equals(
    "attachment file type matches",
    securityStatus.file_type,
    "application/pdf",
  );
}
