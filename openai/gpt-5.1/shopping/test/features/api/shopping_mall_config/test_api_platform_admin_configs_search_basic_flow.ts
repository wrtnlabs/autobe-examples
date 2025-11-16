import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate basic search and pagination flow for platform admin configurations.
 *
 * Business goal
 *
 * - Ensure that a freshly joined platform admin can create configuration entries
 *   and then search them with the PATCH /shoppingMall/platformAdmin/configs
 *   API.
 * - Verify that the search API returns a paginated summary list that includes the
 *   created configuration and exposes only the intended summary fields.
 *
 * High-level steps
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest and realistic random data for
 *         email, name, password, and URLs.
 *    - Rely on SDK to automatically store the access token in the connection.
 * 2. Create at least one configuration entry using POST
 *    /shoppingMall/platformAdmin/configs.
 *
 *    - Build the body to satisfy IShoppingMallConfig.ICreate with explicit
 *         namespace, key, value, optional description, and active: true.
 *    - Optionally create a couple of additional configs under the same namespace to
 *         exercise pagination.
 * 3. Call PATCH /shoppingMall/platformAdmin/configs to search.
 *
 *    - Use an IShoppingMallConfig.IRequest body with:
 *
 *         - Page and limit to request the first page (e.g., page: 1, limit: 10).
 *         - Search matching the created key so that the created config should be present
 *                   in the results.
 * 4. Validate response typing and pagination metadata.
 *
 *    - Typia.assert on the IPageIShoppingMallConfig.ISummary response to fully
 *         validate runtime type and structure.
 *    - Use TestValidator predicates to check that:
 *
 *         - Pagination.limit is positive.
 *         - Pagination.records is >= number of created configs.
 *         - Pagination.pages is consistent when there are records.
 *         - Data.length does not exceed pagination.limit.
 * 5. Verify presence and correctness of the created config in data[] list.
 *
 *    - Find the summary whose id matches the created config.id.
 *    - For that item:
 *
 *         - Namespace equals the original ICreate.namespace.
 *         - Key equals the original ICreate.key.
 *         - IsActive equals the ICreate.active value.
 *    - For valuePreview, check that it is a non-empty string.
 *    - UpdatedAt should be a non-empty date-time string (typia.assert already
 *         ensures format, so we only need to check it is truthy).
 * 6. Negative/edge validation (lightweight, no type errors).
 *
 *    - Perform a second search with a search term that is very unlikely to match the
 *         created keys and assert that pagination.records is 0 and data.length
 *         is 0.
 */
export async function test_api_platform_admin_configs_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin account should be active",
    admin.isActive === true,
  );

  // 2. Create configuration entries
  const namespace = "checkout";
  const baseKey = `max_cart_items_${RandomGenerator.alphaNumeric(6)}`;

  const createBodies: IShoppingMallConfig.ICreate[] = [
    {
      namespace,
      key: baseKey,
      value: "100",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      active: true,
    },
    {
      namespace,
      key: `${baseKey}_secondary`,
      value: "50",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      active: true,
    },
  ];

  const createdConfigs: IShoppingMallConfig[] = [];
  for (const body of createBodies) {
    const created =
      await api.functional.shoppingMall.platformAdmin.configs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdConfigs.push(created);
  }

  TestValidator.equals(
    "number of created configs should match createBodies length",
    createdConfigs.length,
    createBodies.length,
  );

  const primaryConfig: IShoppingMallConfig = createdConfigs[0];

  // 3. Search configs with matching namespace/key via PATCH index
  const limit = 10 as number;
  const requestBody = {
    page: 1 as number,
    limit,
    search: baseKey,
  } satisfies IShoppingMallConfig.IRequest;

  const pageResult: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination.limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= number of created configs",
    pagination.records >= createdConfigs.length,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1 when there are records",
    pagination.records === 0 || pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data length should be <= pagination.limit",
    data.length <= pagination.limit,
  );

  // 5. Ensure created config appears in the results and verify summary fields
  const foundSummary = data.find((item) => item.id === primaryConfig.id);
  TestValidator.predicate(
    "created primary config should be present in the search results",
    foundSummary !== undefined,
  );

  if (foundSummary) {
    TestValidator.equals(
      "summary namespace should match created config namespace",
      foundSummary.namespace,
      primaryConfig.namespace,
    );
    TestValidator.equals(
      "summary key should match created config key",
      foundSummary.key,
      primaryConfig.key,
    );
    TestValidator.equals(
      "summary isActive should reflect created active flag",
      foundSummary.isActive,
      primaryConfig.active,
    );
    TestValidator.predicate(
      "summary valuePreview should be a non-empty string",
      typeof foundSummary.valuePreview === "string" &&
        foundSummary.valuePreview.length > 0,
    );
    TestValidator.predicate(
      "summary updatedAt should be a truthy date-time string",
      typeof foundSummary.updatedAt === "string" &&
        foundSummary.updatedAt.length > 0,
    );
  }

  // 6. Negative search: use a random search token that should not match
  const negativeSearchBody = {
    page: 1 as number,
    limit: 5 as number,
    search: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallConfig.IRequest;

  const negativePage: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: negativeSearchBody,
    });
  typia.assert(negativePage);

  TestValidator.equals(
    "negative search should return zero records",
    negativePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative search should return empty data array",
    negativePage.data.length,
    0,
  );
}
