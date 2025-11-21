import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test public article retrieval functionality for marketplace content
 * accessibility
 *
 * This test validates the public API endpoint for article retrieval, ensuring
 * that published articles are accessible without authentication requirements.
 * The test covers marketplace article content availability for customer
 * engagement and content discovery workflows while maintaining proper
 * publication workflow state validation.
 *
 * The test verifies that:
 *
 * - Public API endpoint serves published article content
 * - Article response structure matches the IShoppingMallArticle type definition
 * - All required fields are populated with valid data types
 * - Optional fields are properly handled when present
 * - Content organization metadata (channel, section, category) is correctly
 *   structured
 * - Publishing workflow states are properly validated
 *
 * This ensures customers can discover and engage with marketplace content
 * through the platform's article system while maintaining editorial standards
 * and proper content categorization.
 */
export async function test_api_article_retrieval_public_content_access(
  connection: api.IConnection,
) {
  // Use API's random generator to get realistic article data structure
  const randomArticle = api.functional.shoppingMall.articles.at.random();
  const articleCode = randomArticle.code;

  // Retrieve article through public API endpoint
  const article = await api.functional.shoppingMall.articles.at(connection, {
    articleCode: articleCode,
  });

  // Validate response structure matches IShoppingMallArticle type
  typia.assert(article);

  // Verify article code matches request
  TestValidator.equals(
    "article code matches request",
    article.code,
    articleCode,
  );

  // Verify article status allows public access (published articles are publicly accessible)
  TestValidator.predicate(
    "article status allows public access",
    article.status === "published",
  );

  // Validate all core article properties
  TestValidator.predicate(
    "article has valid UUID ID",
    typia.is<string & tags.Format<"uuid">>(article.id),
  );

  TestValidator.predicate(
    "article has title content",
    article.title.length > 0,
  );

  TestValidator.predicate("article has body content", article.body.length > 0);

  TestValidator.predicate(
    "article has summary content",
    article.summary.length > 0,
  );

  TestValidator.predicate(
    "article has meta title for SEO",
    article.metaTitle.length > 0,
  );

  TestValidator.predicate(
    "article has meta description for SEO",
    article.metaDescription.length > 0,
  );

  TestValidator.predicate(
    "article status is valid workflow state",
    ["draft", "published", "archived"].includes(article.status),
  );

  TestValidator.predicate(
    "article featured flag is boolean",
    typeof article.featured === "boolean",
  );

  TestValidator.predicate(
    "article commentable flag is boolean",
    typeof article.commentable === "boolean",
  );

  TestValidator.predicate(
    "article has valid timestamp data",
    typia.is<string & tags.Format<"date-time">>(article.createdAt) &&
      typia.is<string & tags.Format<"date-time">>(article.updatedAt),
  );

  // Validate channel information for marketplace context
  TestValidator.predicate(
    "article has valid channel summary",
    article.channel &&
      typia.is<string & tags.Format<"uuid">>(article.channel.id) &&
      article.channel.code.length > 0 &&
      article.channel.name.length > 0 &&
      typeof article.channel.is_active === "boolean" &&
      article.channel.currency_code.length === 3 && // Standard currency codes are 3 characters
      article.channel.language.length >= 2 && // Language codes typically 2+ characters
      typeof article.channel.commission_rate === "number" &&
      article.channel.commission_rate >= 0 && // Commission rate should be non-negative
      typia.is<string & tags.Format<"date-time">>(article.channel.created_at) &&
      typia.is<string & tags.Format<"date-time">>(article.channel.updated_at),
  );

  // Validate section information for content organization
  TestValidator.predicate(
    "article has valid section summary",
    article.section &&
      typia.is<string & tags.Format<"uuid">>(article.section.id) &&
      article.section.code.length > 0 &&
      article.section.name.length > 0 &&
      article.section.section_type.length > 0 &&
      typeof article.section.display_order === "number" &&
      typeof article.section.is_active === "boolean",
  );

  // Check optional parent_id in section for hierarchical organization
  if (
    article.section.parent_id !== undefined &&
    article.section.parent_id !== null
  ) {
    TestValidator.predicate(
      "article section parent ID is valid UUID",
      typia.is<string & tags.Format<"uuid">>(article.section.parent_id),
    );
  }

  // Validate channel category information for content targeting
  TestValidator.predicate(
    "article has valid channel category summary",
    article.channelCategory &&
      typia.is<string & tags.Format<"uuid">>(article.channelCategory.id) &&
      article.channelCategory.code.length > 0 &&
      article.channelCategory.name.length > 0 &&
      article.channelCategory.path.length > 0 &&
      typeof article.channelCategory.level === "number" &&
      article.channelCategory.level >= 0 && // Level should be non-negative
      typeof article.channelCategory.sort_order === "number" &&
      typeof article.channelCategory.is_active === "boolean" &&
      typeof article.channelCategory.is_featured === "boolean",
  );

  // Check optional parent in channel category for hierarchical structure
  if (
    article.channelCategory.parent !== undefined &&
    article.channelCategory.parent !== null
  ) {
    TestValidator.predicate(
      "article channel category parent is valid",
      article.channelCategory.parent &&
        typia.is<string & tags.Format<"uuid">>(
          article.channelCategory.parent.id,
        ) &&
        article.channelCategory.parent.code.length > 0 &&
        article.channelCategory.parent.name.length > 0,
    );
  }

  // Validate optional fields with comprehensive checks
  if (article.subtitle !== undefined) {
    TestValidator.predicate(
      "article subtitle is string",
      typeof article.subtitle === "string",
    );
  }

  if (article.thumbnail !== undefined && article.thumbnail !== null) {
    TestValidator.predicate(
      "article thumbnail is valid URI format",
      typia.is<string & tags.Format<"uri">>(article.thumbnail),
    );
  }

  if (article.metaKeywords !== undefined) {
    TestValidator.predicate(
      "article meta keywords is string",
      typeof article.metaKeywords === "string",
    );
  }

  if (article.publishedAt !== undefined && article.publishedAt !== null) {
    TestValidator.predicate(
      "article published at is valid date-time format",
      typia.is<string & tags.Format<"date-time">>(article.publishedAt),
    );

    // Additional validation: published articles should have publishedAt timestamp
    if (article.status === "published") {
      TestValidator.predicate(
        "published article has publishedAt timestamp",
        article.publishedAt !== null,
      );
    }
  }

  if (article.deletedAt !== undefined && article.deletedAt !== null) {
    TestValidator.predicate(
      "article deleted at is valid date-time format",
      typia.is<string & tags.Format<"date-time">>(article.deletedAt),
    );
  }

  // Verify channel description if present
  if (
    article.channel.description !== undefined &&
    article.channel.description !== null
  ) {
    TestValidator.predicate(
      "channel description is string",
      typeof article.channel.description === "string",
    );
  }

  // Verify channel timezone if present
  if (
    article.channel.time_zone !== undefined &&
    article.channel.time_zone !== null
  ) {
    TestValidator.predicate(
      "channel time zone is string",
      typeof article.channel.time_zone === "string",
    );
  }

  // Verify section description if present
  if (
    article.section.description !== undefined &&
    article.section.description !== null
  ) {
    TestValidator.predicate(
      "section description is string",
      typeof article.section.description === "string",
    );
  }

  // Verify channel category image if present
  if (
    article.channelCategory.image !== undefined &&
    article.channelCategory.image !== null
  ) {
    TestValidator.predicate(
      "channel category image is string",
      typeof article.channelCategory.image === "string",
    );
  }

  // Verify channel category SEO fields if present
  if (
    article.channelCategory.meta_title !== undefined &&
    article.channelCategory.meta_title !== null
  ) {
    TestValidator.predicate(
      "channel category meta title is string",
      typeof article.channelCategory.meta_title === "string",
    );
  }

  if (
    article.channelCategory.meta_description !== undefined &&
    article.channelCategory.meta_description !== null
  ) {
    TestValidator.predicate(
      "channel category meta description is string",
      typeof article.channelCategory.meta_description === "string",
    );
  }

  if (
    article.channelCategory.meta_keywords !== undefined &&
    article.channelCategory.meta_keywords !== null
  ) {
    TestValidator.predicate(
      "channel category meta keywords is string",
      typeof article.channelCategory.meta_keywords === "string",
    );
  }
}
