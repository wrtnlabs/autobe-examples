import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the retrieval of filtered and paginated product summaries via the public
 * product index.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate as an admin user.
 * 2. Create a new product category with realistic data.
 * 3. Create a new seller account with realistic data.
 * 4. Query the product index endpoint with filtering by category ID and validate
 *    pagination and product summaries.
 * 5. Query the product index endpoint filtering by seller ID and validate results.
 * 6. Query the product index endpoint filtering by status and partial name search.
 * 7. Query the product index endpoint with no filters and pagination.
 * 8. Query with non-existing category and seller IDs and expect empty results.
 *
 * Each step uses typia assertions to ensure full type correctness and
 * TestValidator functions to validate business logic and expected results.
 */
