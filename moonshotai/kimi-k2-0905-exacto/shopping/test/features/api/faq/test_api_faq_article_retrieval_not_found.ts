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
 * Test the API response when attempting to retrieve a FAQ article using a
 * non-existent articleCode.
 *
 * This test validates that the system returns an appropriate error response
 * when the requested article is not found in the knowledge base. It tests the
 * API's error handling capabilities and ensures proper request validation
 * against existing article codes in the knowledge base system.
 *
 * The test focuses on:
 *
 * 1. Using a completely random/non-existent article code
 * 2. Verifying that the API properly handles the not-found scenario
 * 3. Ensuring the error response is appropriate and well-formed
 * 4. Testing the system boundary conditions for knowledge base article retrieval
 */
export async function test_api_faq_article_retrieval_not_found(
  connection: api.IConnection,
) {
  // Generate a random article code that is highly unlikely to exist
  const nonExistentArticleCode = typia.random<string>();

  // Attempt to retrieve the FAQ article and expect it to fail
  await TestValidator.error(
    "non-existent FAQ article should return error",
    async () => {
      await api.functional.shoppingMall.faqArticles.at(connection, {
        articleCode: nonExistentArticleCode,
      });
    },
  );
}
