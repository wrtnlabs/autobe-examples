import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test that guest users can access channel-specific category information
 * without authentication. Validates public category navigation access within
 * specific marketplace channels, ensuring that product category hierarchies and
 * organizational structures are available to all visitors. The test confirms
 * that channel-scoped categories maintain proper channel association and enable
 * seamless browsing experiences across different marketplace environments for
 * public users.
 */
export async function test_api_guest_channel_specific_category_access(
  connection: api.IConnection,
) {
  // Test with a single category access to verify guest functionality
  const channelCode = RandomGenerator.alphabets(8);
  const categoryCode = RandomGenerator.alphabets(10);

  // Verify that guest users can access category information without authentication
  const category = await api.functional.shoppingMall.channels.categories.at(
    connection,
    {
      channelCode,
      categoryCode,
    },
  );

  // Complete type validation of the response
  typia.assert(category);

  // Validate business logic - channel association
  TestValidator.equals(
    "category channel code matches request channel",
    category.channel.code,
    channelCode,
  );

  // Verify category structure has core required fields
  TestValidator.predicate(
    "category has required name field",
    category.name !== undefined && category.name.length > 0,
  );
  TestValidator.predicate(
    "category has required code field",
    category.code !== undefined && category.code.length > 0,
  );
  TestValidator.predicate(
    "category has required type field",
    category.category_type !== undefined && category.category_type.length > 0,
  );

  // Validate channel summary fields are present
  TestValidator.predicate(
    "channel summary has code",
    category.channel.code !== undefined,
  );
  TestValidator.predicate(
    "channel summary has name",
    category.channel.name !== undefined,
  );
  TestValidator.predicate(
    "channel summary has active status",
    typeof category.channel.is_active === "boolean",
  );
}
