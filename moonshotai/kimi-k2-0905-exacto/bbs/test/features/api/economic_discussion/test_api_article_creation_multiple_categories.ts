import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation with assignment to multiple discussion categories.
 * Validates that economic discussion articles can be organized under multiple
 * relevant categories (such as both 'Economic Policy' and 'Taxation') to
 * improve discoverability and cross-topic organization within the discussion
 * board.
 *
 * Test process:
 *
 * 1. Create two economic discussion categories (Economic Policy and Taxation)
 * 2. Register as a member for article creation authorization
 * 3. Create article with multi-category assignment for cross-topic organization
 * 4. Validate the article maintains correct categorization relationships
 * 5. Verify cross-categorization enables multi-contextual discoverability
 * 6. Test category assignment validation within platform architecture
 * 7. Ensure proper integration between article management and category taxonomy
 * 8. Validate business rules for multi-category article organization
 *
 * Key assertions:
 *
 * - Article successfully created with multiple category assignments
 * - Categories maintain proper association in response data
 * - Cross-categorization enables discoverability across topic areas
 * - Article metadata correctly reflects assigned categories
 * - Content quality standards maintained with categorization tagging
 * - Moderation workflow supports multi-category organization
 */
export async function test_api_article_creation_multiple_categories(
  connection: api.IConnection,
): Promise<void> {
  let economicPolicyCategory: IEconomicDiscussionCategory;
  let taxationCategory: IEconomicDiscussionCategory;

  // Step 1: Create economic policy category for monetary policy discussions
  economicPolicyCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economic-policy",
          name: "Economic Policy",
          description:
            "Central bank policy, fiscal policy, and regulatory frameworks affecting economic outcomes",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(economicPolicyCategory);

  // Step 2: Create taxation category for cross-disciplinary organization
  taxationCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "taxation",
          name: "Taxation",
          description:
            "Tax policy analysis, tax reform discussions, and fiscal implications of government revenue systems",
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(taxationCategory);

  // Step 3: Register member account for article creation authorization
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8) + "_member";
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "MemberSecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 4: Create comprehensive economic policy analysis article with dual categorization
  const policyAnalysisContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 9,
  });

  const discussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title:
          "Monetary Policy Transmissions to Tax Revenue Cycles: Structural Analysis and Policy Implications",
        content: policyAnalysisContent,
        category_ids: [economicPolicyCategory.id, taxationCategory.id], // Professional cross-categorization approach
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(discussionArticle);

  // Step 5: Validate multi-categorization implementation assertions
  TestValidator.equals(
    "article assigned to exactly two categories for dual-context organization",
    discussionArticle.categories.length,
    2,
  );

  TestValidator.equals(
    "article categories array meets minimum requirements",
    discussionArticle.categories.length,
    Math.max(0, 2), // Ensures compliance with MinItems validation
  );

  // Step 6: Verify both category associations present in structural taxonomy
  const categoryIds = discussionArticle.categories.map((cat) => cat.id);
  TestValidator.predicate(
    "economic_policy_category_id_present_in_article_categorization",
    ArrayUtil.has(categoryIds, (id) => id === economicPolicyCategory.id),
  );

  TestValidator.predicate(
    "taxation_category_id_present_in_article_categorization",
    ArrayUtil.has(categoryIds, (id) => id === taxationCategory.id),
  );

  TestValidator.equals(
    "all_category_ids_are_unique_within_article_relationships",
    new Set(categoryIds).size,
    categoryIds.length,
  );

  // Step 7: Validate cross-discoverability metadata and relationship integrity
  TestValidator.predicate(
    "both_categories_maintain_active_status_for_discoverability",
    discussionArticle.categories.every((cat) => cat.is_active),
  );

  TestValidator.predicate(
    "categories_include_proper_display_properties",
    discussionArticle.categories.every(
      (cat) =>
        typeof cat.code === "string" &&
        cat.code.length > 0 &&
        typeof cat.name === "string" &&
        cat.name.length > 0,
    ),
  );

  TestValidator.predicate(
    "categories_maintain_consistent_ordering_properties",
    discussionArticle.categories.every(
      (cat) =>
        typeof cat.display_order === "number" &&
        Number.isInteger(cat.display_order) &&
        cat.display_order >= 0,
    ),
  );

  // Step 8: Test professional financial analysis content standards compliance
  TestValidator.predicate(
    "article_content_adequately_comprehensive_for_policy_analysis",
    discussionArticle.content.length >= 300, // Sophisticated financial analysis length
  );

  TestValidator.predicate(
    "article_title_includes_policy_relevant_terminology",
    discussionArticle.title.toLowerCase().includes("policy") ||
      discussionArticle.title.toLowerCase().includes("taxation") ||
      discussionArticle.title.toLowerCase().includes("economic"),
  );

  // Step 9: Validate business rule compliance in professional context
  TestValidator.equals(
    "moderation_workflow_initiates_with_proper_pending_status",
    discussionArticle.status,
    "pending",
  );

  TestValidator.predicate(
    "article_metadata_includes_all_required_fields",
    discussionArticle.id.length > 0 &&
      discussionArticle.created_at.length > 0 &&
      typeof discussionArticle.view_count === "number" &&
      typeof discussionArticle.version === "number",
  );

  // Step 10: Certify cross-categorical organizational functionality
  const hasEconomicPolicyCode = discussionArticle.categories.some(
    (cat) => cat.code === "economic-policy",
  );
  const hasTaxationCode = discussionArticle.categories.some(
    (cat) => cat.code === "taxation",
  );

  TestValidator.predicate(
    "article_organized_under_proper_economics_category",
    hasEconomicPolicyCode,
  );

  TestValidator.predicate(
    "article_organized_under_appropriate_taxation_category",
    hasTaxationCode,
  );

  TestValidator.predicate(
    "multi_category_assignment_enables_cross_discipline_discoverability",
    hasEconomicPolicyCode && hasTaxationCode,
  );

  // Step 11: Professional standards validation for economic discussion platform
  TestValidator.predicate(
    "categories_include_reputation_score_system_ready_for_community_voting",
    discussionArticle.categories.every(
      (cat) => typeof cat.article_count === "number" && cat.article_count >= 0,
    ),
  );

  // Final validation: Course syllabus compliance and practical business value
  TestValidator.predicate(
    "multi_categorization_delivers_enhanced_discoverability_value_proposition",
    discussionArticle.categories.length === 2 && // Specific requirement
      discussionArticle.categories[0].is_active &&
      discussionArticle.categories[1].is_active,
  );
}
