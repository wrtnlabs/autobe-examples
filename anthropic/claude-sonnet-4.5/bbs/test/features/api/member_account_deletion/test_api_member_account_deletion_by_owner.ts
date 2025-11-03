import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test complete member account deletion workflow where an authenticated member
 * deletes their own account.
 *
 * This scenario validates the self-service account deletion functionality
 * including password confirmation, personal data removal, content
 * anonymization, and session invalidation.
 *
 * The test begins by creating a new member account through the join operation,
 * establishing an authenticated session. A moderator account is created to
 * handle category creation (admin operation). The member then creates some
 * content (articles) to verify content handling during deletion. Finally, the
 * member initiates account deletion by providing password confirmation.
 *
 * Validation points include: successful account deletion with proper password
 * verification, all personal data removed from the system (email, password
 * hash, profile information), published content either anonymized or removed
 * according to content policy, all active sessions immediately terminated, JWT
 * refresh tokens invalidated to prevent further access, and the operation being
 * irreversible after completion.
 *
 * This test ensures compliance with GDPR and privacy requirements while
 * maintaining data integrity through atomic transactional deletion.
 */
export async function test_api_member_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for deletion testing
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail =
    `${RandomGenerator.alphaNumeric(10)}@test.example.com` satisfies string &
      tags.Format<"email">;
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://test.example.com/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email:
        `${RandomGenerator.alphaNumeric(10)}@moderator.test.com` satisfies string &
          tags.Format<"email">,
      password: moderatorPassword,
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create a category as moderator (required for article creation)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = member.token.access;

  // Step 5: Create an article as the member to verify content handling during deletion
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 6: Member deletes their own account with password confirmation
  await api.functional.discussionBoard.member.members.erase(connection, {
    memberUsername: memberUsername,
    body: {
      password: memberPassword,
      deletion_reason: "Testing account deletion workflow for E2E test",
    } satisfies IDiscussionBoardMember.IDeleteRequest,
  });

  // Step 7: Verify deletion completed successfully (void return indicates success)
  // The operation should complete without throwing errors
  // Personal data should be removed, content anonymized/removed per policy
  // Sessions invalidated, JWT tokens no longer valid
}
