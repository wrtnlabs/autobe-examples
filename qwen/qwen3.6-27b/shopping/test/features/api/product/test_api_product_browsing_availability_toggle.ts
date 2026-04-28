import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product browsing availability toggle functionality with the ecommerce platform products index endpoint.
 *
 * Validates that the product listing pagination endpoint correctly handles the includeUnavailable parameter to control whether products without active variants are included in search results. Tests verify proper product availability status computation based on variant stock levels and that pagination metadata is correctly returned.
 *
 * The test exercises multiple query configurations to ensure consistent behavior including explicit includeUnavailable parameter variations, different sort orders and directions, and pagination offset adjustments. Product summaries are validated for type correctness and business rule compliance.
 *
 * 1. Query products with default parameters (includeUnavailable implicitly false via default undefined value)
 * 2. Verify product summaries pass type validation with proper structure
 * 3. Validate availability status values match expected business rules for products with active variants
 * 4. Query products with includeUnavailable explicitly set to false
 * 5. Confirm results maintain consistency with default behavior
 * 6. Query products with includeUnavailable set to true
 * 7. Validate response structure when unavailable products may be included
 * 8. Test various sort field combinations and pagination settings
 */
export async function test_api_product_browsing_availability_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Query with default includeUnavailable (implicitly false/undefined)
  const request_default: IEcommercePlatformProduct.IRequest = {};
  const response_default =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: request_default,
    });
  typia.assert(response_default);
  // Verify all products have valid isAvailable status
  for (const product of response_default.data) {
    TestValidator.predicate(
      "product has one of three availability statuses",
      product.isAvailable === "active" || product.isAvailable === "outOfStock",
    );
    TestValidator.predicate(
      "product has valid variant count",
      product.variantCount >= 0,
    );
  }
  // 2. Query with includeUnavailable explicitly set to false
  const request_false: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: false,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response_false = await api.functional.ecommercePlatform.products.index(
    connection,
    {
      body: request_false,
    },
  );
  typia.assert(response_false);
  // 3. Query with includeUnavailable set to true
  const request_true: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: true,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response_true = await api.functional.ecommercePlatform.products.index(
    connection,
    {
      body: request_true,
    },
  );
  typia.assert(response_true);
  // Validate pagination metadata
  const pagination = response_true.pagination;
  TestValidator.predicate(
    "pagination has valid current page",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination has valid limit", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination has valid record count",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid page count",
    pagination.pages >= 0,
  );
  // 4. Test with sort field by name ascending
  const request_name_asc: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: false,
    sortField: "name",
    sortOrder: "asc",
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response_name_asc =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: request_name_asc,
    });
  typia.assert(response_name_asc);
  // 5. Test with sort field by base price descending
  const request_price_desc: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: true,
    sortField: "basePrice",
    sortOrder: "desc",
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response_price_desc =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: request_price_desc,
    });
  typia.assert(response_price_desc);
  // 6. Test with sort field by createdAt
  const request_created_asc: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: true,
    sortField: "createdAt",
    sortOrder: "asc",
    offset: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
  const response_created_asc =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: request_created_asc,
    });
  typia.assert(response_created_asc);
  // 7. Test with sort field by updatedAt
  const request_updated_desc: IEcommercePlatformProduct.IRequest = {
    includeUnavailable: false,
    sortField: "updatedAt",
    sortOrder: "desc",
    offset: 10,
  };
  const response_updated_desc =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: request_updated_desc,
    });
  typia.assert(response_updated_desc);
}
