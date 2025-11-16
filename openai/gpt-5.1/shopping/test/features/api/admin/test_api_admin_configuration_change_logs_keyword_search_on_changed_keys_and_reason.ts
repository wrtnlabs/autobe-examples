import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify keyword-based search over admin configuration change logs.
 *
 * Business goal
 *
 * - Ensure that platform admins can search configuration change logs using
 *   keyword filters on changed_keys_summary (changedKeysKeyword) and reason
 *   (reasonKeyword).
 * - This supports semantic discovery of specific policy/configuration changes,
 *   e.g., searching by key fragments or campaign identifiers embedded in
 *   reasons.
 *
 * High-level steps
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest as body.
 *    - Validate response with typia.assert (IAuthorized).
 *    - This also sets Authorization header on the connection for subsequent
 *         platformAdmin endpoints.
 * 2. Perform a baseline search of admin configuration change logs with no keyword
 *    filters using PATCH
 *    /shoppingMall/platformAdmin/adminConfigurationChangeLogs.
 *
 *    - Body type: IShoppingMallAdminConfigurationChangeLog.IRequest.
 *    - Use a small limit (e.g., 10) and page=1.
 *    - Assert response shape via typia.assert as
 *         IPageIShoppingMallAdminConfigurationChangeLog.ISummary.
 * 3. If baseline search returns at least one log record: 3-1. Select the first log
 *    entry as a sample. 3-2. Extract a keyword fragment from
 *    changed_keys_summary (e.g., a RandomGenerator.substring of it) and use
 *    this as changedKeysKeyword. 3-3. If the sample has a non-undefined reason,
 *    extract a keyword fragment from reason as reasonKeyword. 3-4. Call the
 *    index endpoint again with: - same pagination parameters, -
 *    changedKeysKeyword set to the extracted fragment, - and reasonKeyword set
 *    only if we had a non-undefined reason fragment. 3-5. Assert that: - The
 *    response still has at least one record. - There exists at least one entry
 *    whose id matches the original sample id. - That entry's config_key equals
 *    the original config_key. - When reasonKeyword was set and original reason
 *    existed, the entry's reason (if present) contains the keyword fragment. -
 *    Note: The server may also return other records that match the keyword,
 *    which is acceptable.
 * 4. Negative keyword test (only if baseline had at least one record): 4-1.
 *    Generate a high-entropy random string via RandomGenerator.alphaNumeric(32)
 *    and use it as both changedKeysKeyword and reasonKeyword. 4-2. Call the
 *    index endpoint again with those keywords and same pagination parameters.
 *    4-3. Assert that the response data array is empty, validating that
 *    irrelevant keywords correctly result in no matches.
 * 5. If baseline search returns zero records:
 *
 *    - The test cannot perform meaningful keyword validation but can still validate
 *         that the endpoint responds with a well-formed empty page. In this
 *         case, skip the positive- and negative- keyword subtests.
 */
export async function test_api_admin_configuration_change_logs_keyword_search_on_changed_keys_and_reason(
  connection: api.IConnection,
) {
  // 1. Register (join) a platform admin so that subsequent calls run
  //    under an authenticated platformAdmin context. The SDK join
  //    function will automatically attach the access token to
  //    connection.headers.Authorization.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Baseline search with no keyword filters, small page size.
  const baselineRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const baselinePage =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
    baselinePage,
  );

  // Basic structural assertions on pagination.
  TestValidator.predicate(
    "baseline pagination current page is non-negative",
    baselinePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline pagination limit is non-negative",
    baselinePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline pagination records is non-negative",
    baselinePage.pagination.records >= 0,
  );

  if (baselinePage.data.length === 0) {
    // No data to perform keyword-based assertions; the endpoint still
    // responded correctly with an empty page, which is validated by
    // typia.assert and pagination checks above.
    return;
  }

  // 3. Positive keyword search based on an existing log entry.
  const sample: IShoppingMallAdminConfigurationChangeLog.ISummary =
    baselinePage.data[0];

  // Extract keyword fragment from changed_keys_summary. Use substring
  // helper to avoid extremely short tokens.
  const rawChangedKeys = sample.changed_keys_summary;
  const changedKeysKeyword = RandomGenerator.substring(rawChangedKeys);

  const hasReason = sample.reason !== undefined && sample.reason !== "";
  const rawReason = hasReason ? sample.reason! : undefined;
  const reasonKeyword =
    rawReason !== undefined ? RandomGenerator.substring(rawReason) : undefined;

  const filteredRequestWithKeywords: IShoppingMallAdminConfigurationChangeLog.IRequest =
    {
      page: baselineRequest.page,
      limit: baselineRequest.limit,
      changedKeysKeyword,
      ...(reasonKeyword !== undefined ? { reasonKeyword } : {}),
    };

  const filteredPage =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      {
        body: filteredRequestWithKeywords,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
    filteredPage,
  );

  TestValidator.predicate(
    "filtered page has at least one record when searching by valid changedKeysKeyword",
    filteredPage.data.length > 0,
  );

  const matchedById = filteredPage.data.find((entry) => entry.id === sample.id);
  TestValidator.predicate(
    "filtered results include the originally sampled configuration change log by id",
    matchedById !== undefined,
  );

  if (matchedById !== undefined) {
    TestValidator.equals(
      "matched entry config_key equals sample config_key",
      matchedById.config_key,
      sample.config_key,
    );

    if (reasonKeyword !== undefined && rawReason !== undefined) {
      TestValidator.predicate(
        "matched entry reason (if present) contains the reasonKeyword fragment",
        matchedById.reason !== undefined &&
          matchedById.reason.includes(reasonKeyword),
      );
    }
  }

  // 4. Negative keyword test: use a very unlikely random keyword and
  // expect no records.
  const unlikelyKeyword = RandomGenerator.alphaNumeric(32);
  const negativeRequest: IShoppingMallAdminConfigurationChangeLog.IRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    changedKeysKeyword: unlikelyKeyword,
    reasonKeyword: unlikelyKeyword,
  };

  const negativePage =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      {
        body: negativeRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
    negativePage,
  );

  TestValidator.equals(
    "negative keyword search returns no configuration change log entries",
    negativePage.data.length,
    0,
  );
}
