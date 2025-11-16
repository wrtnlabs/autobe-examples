import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that unverified member accounts cannot create articles to ensure content
 * quality and accountability requirements.
 *
 * This test validates that the economic discussion platform properly enforces
 * email verification requirements before allowing article creation. It ensures
 * content quality standards by preventing unverified members from creating
 * economic discussion articles, maintaining accountability and preventing
 * potential spam or low-quality content.
 *
 * The test follows this workflow:
 *
 * 1. Create a new member account through normal registration (email_verified
 *    defaults to false)
 * 2. Use the authenticated connection to attempt article creation
 * 3. Verify the system rejects the request for unverified members
 * 4. Ensure proper error handling and security boundaries are maintained
 *
 * This validation is crucial for maintaining the integrity of economic and
 * political discussions on the platform, ensuring participants have verified
 * their email addresses before contributing content.
 */
export async function test_api_article_creation_unverified_member_fail(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account (with email_verified defaulting to false)
  const memberData = {
    username: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IEconomicDiscussionMember.ICreate;

  const newMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(newMember);

  // Step 2: Attempt to create an article with the unverified member account
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Step 3: Verify article creation fails for unverified member
  await TestValidator.error(
    "unverified member should be rejected from creating articles",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: articleData,
        },
      );
    },
  );

  // Additional validation: Confirm the connection maintains member authentication
  TestValidator.predicate(
    "connection maintains member authentication after registration",
    connection.headers?.Authorization !== undefined,
  );
}
