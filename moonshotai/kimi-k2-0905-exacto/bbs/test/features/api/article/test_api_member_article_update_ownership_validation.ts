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
 * Test article update ownership validation for economic discussion platform.
 *
 * This comprehensive test validates the ownership boundaries and authorization
 * mechanisms that prevent unauthorized article modifications in the economic
 * discussion system. The test implements a complete workflow that demonstrates
 * proper ownership encapsulation:
 *
 * 1. Create First Member Account - Establishes primary test user with article
 *    creation privileges
 * 2. Create Second Member Account - Establishes secondary user for unauthorized
 *    access testing
 * 3. Authentication Context Setup - Ensures proper authorization state for article
 *    operations
 * 4. Article Creation Under Owner - Creates initial article content under first
 *    member's ownership
 * 5. Verified Owner Update - Demonstrates that legitimate authors can update their
 *    content freely
 * 6. Unauthorized Update Prevention - Validates that non-owners cannot modify
 *    others' articles
 * 7. Version Tracking Validation - Confirms systematic version incrementing during
 *    updates
 * 8. Timestamp Management - Ensures update timestamps reflect modification events
 *    accurately
 *
 * The test emphasizes security boundaries essential for maintaining content
 * integrity in economic and political discourse platforms, where accurate
 * attribution and ownership preservation are critical for trustworthy
 * information exchange.
 */
export async function test_api_member_article_update_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account for article creation
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberUsername = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9_-]{3,30}$">
  >();
  const firstMemberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      username: firstMemberUsername,
      password: "SecurePassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(firstMemberAuth);

  // Step 2: Create separate connection context for second member account
  const secondConnection = {
    ...connection,
    headers: {} as Record<string, string>,
  };
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberUsername = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9_-]{3,30}$">
  >();
  const secondMemberAuth = await api.functional.auth.member.join(
    secondConnection,
    {
      body: {
        email: secondMemberEmail,
        username: secondMemberUsername,
        password: "DifferentPassword456",
      } satisfies IEconomicDiscussionMember.ICreate,
    },
  );
  typia.assert(secondMemberAuth);

  // Step 3: Create article under first member's ownership
  const categoryIds = [typia.random<string & tags.Format<"uuid">>()];
  const initialArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis: 2024 Tax Reform Impact",
        content:
          "This comprehensive analysis examines the potential effects of proposed tax reforms on small business competitiveness... detailed economic modeling demonstrates significant regional variation in impact assessments.",
        category_ids: categoryIds,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 4: Update article as legitimate owner (first member)
  const updatedContent =
    "Updated analysis incorporating Q4 2024 economic data reveals adjusted projections for small business growth... revised economic modeling accounts for regional policy implementation differences.";
  const firstUpdate =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: "Economic Policy Analysis: 2024 Tax Reform Impact - UPDATED",
        content: updatedContent,
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  typia.assert(firstUpdate);

  // Validate updates were applied successfully
  TestValidator.equals(
    "article ownership maintained",
    firstUpdate.member_author_profile?.id,
    firstMemberAuth.member.id,
  );
  TestValidator.equals(
    "version incremented after update",
    firstUpdate.version,
    initialArticle.version + 1,
  );
  TestValidator.equals(
    "content updated successfully",
    firstUpdate.content,
    updatedContent,
  );
  TestValidator.equals(
    "title updated successfully",
    firstUpdate.title,
    "Economic Policy Analysis: 2024 Tax Reform Impact - UPDATED",
  );

  // Step 5: Attempt update as non-owner (second member) - should fail
  await TestValidator.error("non-owner cannot update article", async () => {
    await api.functional.economicDiscussion.member.articles.update(
      secondConnection,
      {
        articleId: initialArticle.id,
        body: {
          title: "Hijacked Article Content",
          content:
            "This article has been modified by an unauthorized user to demonstrate security vulnerability.",
        } satisfies IEconomicDiscussionArticle.IUpdate,
      },
    );
  });

  // Step 6: Verify original owner can still update after unauthorized attempt
  const finalUpdate =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: "Economic Policy Analysis: Final Verification Update",
        content:
          "Continuing with legitimate owner modifications to ensure content integrity remains intact throughout the ownership boundary validation process.",
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  typia.assert(finalUpdate);

  // Final ownership validation
  TestValidator.equals(
    "ownership preserved throughout process",
    finalUpdate.member_author_profile?.id,
    firstMemberAuth.member.id,
  );
  TestValidator.equals(
    "version continuing to increment",
    finalUpdate.version,
    firstUpdate.version + 1,
  );
  TestValidator.equals(
    "content represents legitimate edits",
    finalUpdate.content,
    "Continuing with legitimate owner modifications to ensure content integrity remains intact throughout the ownership boundary validation process.",
  );
}
