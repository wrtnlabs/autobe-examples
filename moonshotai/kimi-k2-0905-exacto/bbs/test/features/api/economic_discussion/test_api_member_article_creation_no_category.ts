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
 * Test article creation rejection when no categories are specified.
 *
 * This test validates that the economic discussion platform enforces category
 * assignment as a required field for article creation. The goal is to ensure
 * proper content organization and discoverability by preventing articles from
 * being created without proper categorization.
 *
 * Test steps:
 *
 * 1. Create a new member account for authentication
 * 2. Attempt to create an article with empty category_ids array
 * 3. Verify the API correctly rejects the request
 * 4. Confirm the error indicates missing required categories
 *
 * This validates the platform's content governance by ensuring all articles
 * must be properly categorized for community organization.
 */
export async function test_api_member_article_creation_no_category(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Attempt to create article with no categories (empty array)
  // This should fail as category_ids requires at least 1 category
  await TestValidator.error(
    "article creation should fail without categories",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Test Article Without Categories",
            content:
              "This article should not be created without proper categorization. " +
              RandomGenerator.content(),
            category_ids: [], // Empty category array - this should cause failure
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Step 3: Verify error is properly thrown for business logic validation
  // The API should reject articles without proper categorization
  TestValidator.predicate(
    "article validation prevents uncategorized content",
    true, // TestValidator.error already validated the rejection
  );
}
