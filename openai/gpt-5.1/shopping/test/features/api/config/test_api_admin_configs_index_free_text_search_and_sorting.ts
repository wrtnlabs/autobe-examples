import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate free-text search and alphabetical sorting over admin configurations
 * index.
 *
 * Business goal: Ensure that an authenticated shopping mall administrator can
 * perform a single PATCH /shoppingMall/admin/configs request with
 * IShoppingMallConfig.IRequest to:
 *
 * - Search configuration rows by a free-text keyword (e.g., "cart") applied
 *   across config_key and description (and conceptually value_json), and
 * - Sort the results alphabetically by config_key in ascending order, honoring
 *   pagination settings.
 *
 * Test flow:
 *
 * 1. Admin registration and authentication
 *
 *    - Call POST /auth/admin/join with a realistic IShoppingMallAdminJoin.ICreate
 *         payload created via typia.random to obtain an
 *         IShoppingMallAdmin.IAuthorized response.
 *    - Typia.assert the authorization payload to ensure type correctness.
 *    - Rely on the SDK behavior that sets Authorization header on the connection for
 *         subsequent admin requests.
 * 2. Test data setup: create multiple config rows
 *
 *    - Using POST /shoppingMall/admin/configs (IShoppingMallConfig.ICreate), create
 *         at least three configuration entries: a) cart_max_items
 *
 *         - Namespace: "cart"
 *         - Config_key: "cart_max_items"
 *         - Environment: "production"
 *         - Description: includes the keyword "cart" and "limit" (e.g., "Maximum cart
 *                   item limit for production cart")
 *         - Value_json: a JSON string like '{"maxItems": 50, "label": "cart limit"}'
 *         - Is_active: true b) cart_warning_threshold
 *         - Namespace: "cart"
 *         - Config_key: "cart_warning_threshold"
 *         - Environment: "production"
 *         - Description: includes the keyword "cart" and "limit" again (e.g., "Warning
 *                   limit before cart is full")
 *         - Value_json: a JSON string like '{"warningThreshold": 40, "note": "cart
 *                   nearing limit"}'
 *         - Is_active: true c) catalog_feature_toggle
 *         - Namespace: "catalog"
 *         - Config_key: "catalog_feature_toggle"
 *         - Environment: "production"
 *         - Description: does NOT contain the word "cart" (e.g., "Feature toggle for
 *                   catalog view experiments")
 *         - Value_json: a JSON string like '{"feature": "newCatalog", "enabled": true}'
 *         - Is_active: true
 *    - Typia.assert each returned IShoppingMallConfig entity so we know the configs
 *         have been created correctly, and collect their summaries (id,
 *         config_key, description, etc.) for later comparisons if needed.
 *    - Optionally, to exercise pagination behavior with limit enforcement, create
 *         several more cart-related configurations (e.g., 10+ total whose
 *         config_key or description contains "cart") using a loop and
 *         RandomGenerator-altered suffixes (like cart_extra_1,
 *         cart_extra_2,...), always ensuring the description includes the
 *         substring "cart".
 * 3. Call the index endpoint with free-text search and sorting
 *
 *    - Invoke PATCH /shoppingMall/admin/configs via
 *         api.functional.shoppingMall.admin.configs.index with
 *         IShoppingMallConfig.IRequest body: { page: 0, limit: 10, search:
 *         "cart", order_by: "config_key", order_direction: "asc" }
 *    - Typia.assert the response as IPageIShoppingMallConfig.ISummary to validate
 *         shape and types.
 * 4. Validate that search filtering has been applied
 *
 *    - For every element in response.data (IShoppingMallConfig.ISummary):
 *
 *         - Ensure that either:
 *
 *                           - Config_key contains "cart" (case-insensitive), OR
 *                           - Description (when not null/undefined) contains "cart" (case-insensitive).
 *         - Use TestValidator.predicate with a descriptive title, such as "configs index
 *                   search filters cart keyword".
 *    - Explicitly verify that the non-cart configuration (e.g.,
 *         "catalog_feature_toggle") does NOT appear in the data list by
 *         checking all config_key values and asserting that none equals the
 *         non-cart key. Use TestValidator.predicate or TestValidator.equals
 *         with a descriptive title for this negative check.
 * 5. Validate that sorting by config_key asc is applied
 *
 *    - Iterate through adjacent pairs in response.data and assert that a.config_key
 *         <= b.config_key using lexicographic comparison.
 *    - Use TestValidator.predicate with a clear title such as "configs index results
 *         sorted by config_key asc".
 *    - This validates the order_by="config_key" and order_direction="asc" behavior.
 * 6. Validate pagination metadata and limit behavior
 *
 *    - From response.pagination (IPage.IPagination):
 *
 *         - Assert that `current` equals the requested page (0).
 *         - Assert that `limit` equals the requested limit (10).
 *         - Assert that `records` is greater than or equal to response.data.length.
 *         - Assert that `pages` is equal to Math.ceil(records / limit).
 *         - Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *                   (e.g., "configs index pagination limit matches request",
 *                   "configs index pages consistent with records and limit").
 *    - If more than `limit` matching cart configurations were created in step 2,
 *         further assert that `response.data.length` is less than or equal to
 *         `limit` (and typically equals `limit` when enough matching rows
 *         exist), demonstrating that the limit is enforced even when multiple
 *         matches exist.
 * 7. Edge considerations and robustness
 *
 *    - All API calls must be awaited.
 *    - No manual manipulation of connection.headers; rely on SDK behavior from the
 *         join call.
 *    - Only use fields exposed by IShoppingMallConfig.ISummary in assertions
 *         (id/namespace/config_key/environment/description/is_active
 *         created_at/updated_at) and treat value_json as verified indirectly
 *         via the create step.
 */
export async function test_api_admin_configs_index_free_text_search_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create base configuration rows for search scenario
  const cartMaxItems: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: {
        namespace: "cart",
        config_key: "cart_max_items",
        environment: "production",
        description:
          "Maximum cart item limit for production cart configuration",
        value_json: '{"maxItems":50,"label":"cart limit configuration"}',
        is_active: true,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(cartMaxItems);

  const cartWarningThreshold: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: {
        namespace: "cart",
        config_key: "cart_warning_threshold",
        environment: "production",
        description: "Warning limit before cart is full for cart users",
        value_json: '{"warningThreshold":40,"note":"cart nearing limit"}',
        is_active: true,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(cartWarningThreshold);

  const catalogFeatureToggle: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: {
        namespace: "catalog",
        config_key: "catalog_feature_toggle",
        environment: "production",
        description: "Feature toggle for catalog view experiments",
        value_json: '{"feature":"newCatalog","enabled":true}',
        is_active: true,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(catalogFeatureToggle);

  // Optionally create additional cart-related configs to exercise pagination
  const extraCartCount = 12;
  await ArrayUtil.asyncRepeat(extraCartCount, async (index) => {
    const suffix = index.toString();
    const extraConfigKey = `cart_extra_${suffix}`;
    const extraDescription = `Extra cart configuration ${suffix} for cart limit testing`;
    const extraValueJson = `{"name":"cart_extra_${suffix}","note":"cart config ${suffix}"}`;

    const extraConfig: IShoppingMallConfig =
      await api.functional.shoppingMall.admin.configs.create(connection, {
        body: {
          namespace: "cart",
          config_key: extraConfigKey,
          environment: "production",
          description: extraDescription,
          value_json: extraValueJson,
          is_active: true,
        } satisfies IShoppingMallConfig.ICreate,
      });
    typia.assert(extraConfig);
  });

  // 3. Call index with search and sorting
  const requestedPage = 0;
  const requestedLimit = 10;
  const searchKeyword = "cart";

  const pageResult: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.index(connection, {
      body: {
        page: requestedPage,
        limit: requestedLimit,
        search: searchKeyword,
        order_by: "config_key",
        order_direction: "asc",
      } satisfies IShoppingMallConfig.IRequest,
    });
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate search filtering: all results must contain "cart" in
  // config_key or description (case-insensitive) and non-cart key excluded.
  const keywordLower = searchKeyword.toLowerCase();

  for (const summary of data) {
    const keyLower = summary.config_key.toLowerCase();
    const descriptionLower =
      summary.description !== null && summary.description !== undefined
        ? summary.description.toLowerCase()
        : "";

    const containsKeyword =
      keyLower.includes(keywordLower) ||
      descriptionLower.includes(keywordLower);

    TestValidator.predicate(
      "configs index search filters by cart keyword in key or description",
      containsKeyword,
    );

    TestValidator.notEquals(
      "non-cart config_key should not appear in cart search results",
      summary.config_key,
      catalogFeatureToggle.config_key,
    );
  }

  // 5. Validate alphabetical sorting by config_key ascending
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const isSorted = prev.config_key <= curr.config_key;

    TestValidator.predicate(
      "configs index results sorted by config_key ascending",
      isSorted,
    );
  }

  // 6. Validate pagination metadata and limit behavior
  TestValidator.equals(
    "configs index pagination current page matches request",
    pagination.current,
    requestedPage,
  );

  TestValidator.equals(
    "configs index pagination limit matches request",
    pagination.limit,
    requestedLimit,
  );

  TestValidator.predicate(
    "configs index pagination records >= returned data length",
    pagination.records >= (data.length as number),
  );

  const expectedPages =
    pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);

  TestValidator.equals(
    "configs index pagination pages equals ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "configs index returned data length does not exceed requested limit",
    data.length <= requestedLimit,
  );
}
