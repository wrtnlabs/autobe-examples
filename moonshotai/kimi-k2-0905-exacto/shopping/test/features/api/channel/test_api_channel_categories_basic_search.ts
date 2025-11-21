import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test basic category search functionality within a shopping mall channel.
 *
 * This comprehensive test validates the fundamental category discovery
 * mechanism within channel context by performing the following steps:
 *
 * 1. Create a new marketplace channel to host product categories
 * 2. Search for categories within the channel using default pagination settings
 * 3. Verify that categories are retrieved with essential navigation data
 * 4. Validate the pagination information and response structure
 * 5. Ensure customer browsing experience data is available
 *
 * The test confirms that the channel-specific category hierarchy is properly
 * accessible for marketplace operations and that basic search functionality
 * provides the necessary data for navigation optimization.
 */
export async function test_api_channel_categories_basic_search(
  connection: api.IConnection,
) {
  // Step 1: Create a marketplace channel for testing
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelData = {
    code: channelCode,
    name: `${RandomGenerator.name()} Marketplace`,
    currency_code: "USD",
    language: "en",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  TestValidator.equals("channel code matches", channel.code, channelCode);
  TestValidator.predicate("channel is active", channel.is_active === true);

  // Step 2: Search for categories with default settings
  const searchRequest = {
    search: undefined,
    category_type: undefined,
    is_active: undefined,
    parent_id: undefined,
    sort_by: undefined,
    sort_order: undefined,
    include_inactive: undefined,
  } satisfies IShoppingMallChannelCategory.IRequest;

  const categories: IPageIShoppingMallChannelCategory.ISummary =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: searchRequest,
    });
  typia.assert(categories);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination data exists",
    categories.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page valid",
    categories.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    categories.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records valid",
    categories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages valid",
    categories.pagination.pages >= 0,
  );

  // Step 4: Validate category data structure
  TestValidator.predicate(
    "categories array exists",
    Array.isArray(categories.data),
  );

  // If categories exist, validate their structure
  if (categories.data.length > 0) {
    const firstCategory = categories.data[0];
    TestValidator.predicate(
      "category has valid UUID",
      typia.is<string & tags.Format<"uuid">>(firstCategory.id),
    );
    TestValidator.predicate(
      "category has code",
      typeof firstCategory.code === "string" && firstCategory.code.length > 0,
    );
    TestValidator.predicate(
      "category has name",
      typeof firstCategory.name === "string" && firstCategory.name.length > 0,
    );
    TestValidator.predicate(
      "category has path",
      typeof firstCategory.path === "string",
    );
    TestValidator.predicate(
      "category has valid level",
      typia.is<number & tags.Type<"int32">>(firstCategory.level),
    );
    TestValidator.predicate(
      "category has valid sort order",
      typia.is<number & tags.Type<"int32">>(firstCategory.sort_order),
    );
    TestValidator.predicate(
      "category has is_active boolean",
      typeof firstCategory.is_active === "boolean",
    );
    TestValidator.predicate(
      "category has is_featured boolean",
      typeof firstCategory.is_featured === "boolean",
    );

    // Validate optional fields if present
    if (
      firstCategory.description !== null &&
      firstCategory.description !== undefined
    ) {
      TestValidator.predicate(
        "description is string",
        typeof firstCategory.description === "string",
      );
    }
    if (firstCategory.image !== null && firstCategory.image !== undefined) {
      TestValidator.predicate(
        "image is string",
        typeof firstCategory.image === "string",
      );
    }
    if (firstCategory.parent !== null && firstCategory.parent !== undefined) {
      TestValidator.predicate(
        "parent has id",
        typia.is<string & tags.Format<"uuid">>(firstCategory.parent.id),
      );
    }
  }

  // Step 5: Test with search query
  const searchWithQuery = {
    search: "electronics",
    category_type: undefined,
    is_active: true,
    parent_id: undefined,
    sort_by: "name" as const,
    sort_order: "asc" as const,
    include_inactive: false,
  } satisfies IShoppingMallChannelCategory.IRequest;

  const filteredCategories: IPageIShoppingMallChannelCategory.ISummary =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: searchWithQuery,
    });
  typia.assert(filteredCategories);

  TestValidator.predicate(
    "filtered search returns valid structure",
    Array.isArray(filteredCategories.data),
  );
  TestValidator.predicate(
    "filtered pagination valid",
    filteredCategories.pagination.current >= 0,
  );

  // Test with different sort options
  const sortByCreatedAt = {
    search: undefined,
    category_type: undefined,
    is_active: undefined,
    parent_id: undefined,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
    include_inactive: undefined,
  } satisfies IShoppingMallChannelCategory.IRequest;

  const sortedCategories: IPageIShoppingMallChannelCategory.ISummary =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: sortByCreatedAt,
    });
  typia.assert(sortedCategories);

  TestValidator.predicate(
    "sorted search returns valid structure",
    Array.isArray(sortedCategories.data),
  );
  TestValidator.predicate(
    "sorted pagination valid",
    sortedCategories.pagination.current >= 0,
  );

  // Final validation: ensure all responses maintain consistent structure
  TestValidator.predicate(
    "all searches return IPage structure",
    categories.pagination !== null &&
      filteredCategories.pagination !== null &&
      sortedCategories.pagination !== null,
  );
}
