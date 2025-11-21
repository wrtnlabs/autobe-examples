import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallFaqArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqArticle";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";

/**
 * Test that FAQ article retrieval properly handles language-specific access by
 * verifying language field validation returns content in the appropriate
 * language using ISO 639-1 codes. Ensures that articles retrieved through their
 * article code contain the correct language specification matching user
 * preferences and interface localization settings, supporting the platform's
 * multilingual knowledge base functionality.
 *
 * This test validates the API's ability to retrieve FAQ articles with proper
 * language detection, ensuring that the platform's multilingual support
 * correctly serves content in the appropriate language for different user
 * segments.
 */
export async function test_api_faq_article_retrieval_detect_language_version(
  connection: api.IConnection,
) {
  // Generate multiple article codes to test diverse content
  const articleCodes = ArrayUtil.repeat(8, () =>
    typia.random<
      string & tags.Format<"regex"> & tags.Pattern<"^[a-z0-9-]+$">
    >(),
  );

  // Expected language codes based on platform multilingual support
  const supportedLanguages = [
    "en",
    "ko",
    "ja",
    "zh",
    "fr",
    "de",
    "es",
  ] as const;

  // Track unique language codes encountered across retrievals
  const encounteredLanguages = new Set<string>();

  // Test retrieval and validation for each article code
  for (const articleCode of articleCodes) {
    // Retrieve FAQ article by article code
    const article: IShoppingMallFaqArticle =
      await api.functional.shoppingMall.faqArticles.at(connection, {
        articleCode,
      });

    // Complete type validation of the response
    typia.assert(article);

    // Validate language field structure and constraints
    TestValidator.predicate(
      "language field contains valid 2-character ISO 639-1 code",
      article.language.length === 2 &&
        article.language === article.language.toLowerCase() &&
        /^[a-z]{2}$/.test(article.language),
    );

    // Validate language content meets business requirements
    TestValidator.predicate(
      "article content structure supports multilingual functionality",
      article.title.length > 0 &&
        article.content.length > 0 &&
        article.excerpt.length <= 300, // MaxLength constraint validation
    );

    // Track encountered languages for coverage analysis
    encounteredLanguages.add(article.language);

    // Validate that language field works within platform constraints
    TestValidator.predicate(
      "language field respects repository MaxLength<2> constraint",
      article.language.length <= 2,
    );

    // Verify language consistency with content type
    TestValidator.predicate(
      "content type is appropriate for knowledge base articles",
      typeof article.content === "string" && article.content.length > 100,
    );
  }

  // Validate multilingual knowledge base coverage
  TestValidator.predicate(
    "encountered multiple supported languages across article retrieval",
    encounteredLanguages.size >= 2,
  );

  // Verify that all encountered languages are valid ISO 639-1 codes
  TestValidator.predicate(
    "all encountered languages are in supported language set",
    Array.from(encounteredLanguages).every((lang) =>
      supportedLanguages.includes(lang as any),
    ),
  );

  // Validate article code format consistency
  TestValidator.predicate(
    "article codes follow consistent URL-friendly format",
    articleCodes.every((code) => /^[a-z0-9-]+$/.test(code)),
  );

  // Verify platform multilingual support functionality
  TestValidator.predicate(
    "platform supports comprehensive language detection in FAQ system",
    encounteredLanguages.size >= 3, // Expecting at least 3 different languages
  );
}
