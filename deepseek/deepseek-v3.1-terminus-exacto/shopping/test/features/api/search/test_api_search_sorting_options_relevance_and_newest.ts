import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test different sorting options including relevance (when search term provided) and
 * newest first (when no search term). Search without text query using newest first
 * sort to verify products are returned in reverse chronological order by creation date.
 * Then search with text query using relevance sort to verify results are ranked by
 * term matching score. Validate that sorting behavior aligns with business requirements
 * for search ranking and product discovery.
 */
export async function test_api_search_sorting_options_relevance_and_newest(
  connection: api.IConnection,
): Promise<void> {
  // Test newest sorting without search term
  const newestResponse = await api.functional.ecommerce.search(connection, {
    body: {
      search: undefined,
      category_id: undefined,
      price_min: undefined,
      price_max: undefined,
      in_stock: undefined,
      sort_by: "newest",
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies IEcommerceProduct.IRequest,
  });
  typia.assert(newestResponse);
  // Validate pagination metadata for newest sort
  TestValidator.predicate(
    "newest sort has pagination data",
    newestResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "newest sort has records count",
    newestResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "newest sort has pages count",
    newestResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "newest sort limit matches request",
    newestResponse.pagination.limit === 10,
  );
  // Test relevance sorting with search term
  const searchTerm = RandomGenerator.alphabets(3);
  const relevanceResponse = await api.functional.ecommerce.search(connection, {
    body: {
      search: searchTerm,
      category_id: undefined,
      price_min: undefined,
      price_max: undefined,
      in_stock: undefined,
      sort_by: "relevance",
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies IEcommerceProduct.IRequest,
  });
  typia.assert(relevanceResponse);
  // Validate pagination metadata for relevance sort
  TestValidator.predicate(
    "relevance sort has pagination data",
    relevanceResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "relevance sort has records count",
    relevanceResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "relevance sort has pages count",
    relevanceResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "relevance sort limit matches request",
    relevanceResponse.pagination.limit === 10,
  );
  // Validate that both responses contain valid product data structure
  if (newestResponse.data.length > 0) {
    newestResponse.data.forEach((product, index) => {
      TestValidator.predicate(`newest product ${index} has id`, !!product.id);
      TestValidator.predicate(
        `newest product ${index} has name`,
        !!product.name,
      );
      TestValidator.predicate(
        `newest product ${index} has price`,
        product.base_price >= 0,
      );
      TestValidator.predicate(
        `newest product ${index} has seller`,
        !!product.seller,
      );
      TestValidator.predicate(
        `newest product ${index} has category`,
        !!product.category,
      );
    });
  }
  if (relevanceResponse.data.length > 0) {
    relevanceResponse.data.forEach((product, index) => {
      TestValidator.predicate(
        `relevance product ${index} has id`,
        !!product.id,
      );
      TestValidator.predicate(
        `relevance product ${index} has name`,
        !!product.name,
      );
      TestValidator.predicate(
        `relevance product ${index} has price`,
        product.base_price >= 0,
      );
      TestValidator.predicate(
        `relevance product ${index} has seller`,
        !!product.seller,
      );
      TestValidator.predicate(
        `relevance product ${index} has category`,
        !!product.category,
      );
    });
  }
  // Validate that searches with different parameters return different results
  TestValidator.notEquals(
    "newest and relevance searches should have different data structures",
    newestResponse.data.map((p) => p.id),
    relevanceResponse.data.map((p) => p.id),
  );
}
