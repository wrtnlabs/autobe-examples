import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate filtered retrieval of admin action audit analytics by action type
 * and resource.
 *
 * Business goal
 *
 * - Ensure that a platform admin can query administrative action audit analytics
 *   using filters on actionTypes, resourceTypes, and resourceId and receive
 *   only matching rows.
 * - Ensure that when no rows match the given filter combination, the endpoint
 *   responds with an empty page while keeping pagination metadata consistent.
 *
 * High-level flow
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join via
 *    api.functional.auth.platformAdmin.join, which also wires the access token
 *    into the connection headers.
 * 2. Perform an unfiltered (or lightly filtered) analytics query using
 *    api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index
 *    with a simple IShoppingMallAdminActionAudit.IRequest to discover an
 *    existing audit row to use as a baseline for targeted filtering.
 * 3. If at least one audit row exists: 3-1. Select the first row and extract its
 *    action_type, target_type, and target_id values. 3-2. Build a targeted
 *    IShoppingMallAdminActionAudit.IRequest with: - page = 1 - limit = 10 -
 *    actionTypes = [selected.action_type] - resourceTypes =
 *    [selected.target_type] - resourceId = selected.target_id - sortBy =
 *    "created_at" - sortDirection = "desc" 3-3. Call the analytics index
 *    endpoint again with this filter and assert: - The response structure
 *    passes typia.assert as IPageIShoppingMallAdminActionAudit.ISummary. - For
 *    every row, action_type, target_type, and target_id match the requested
 *    filter values. - pagination.records is >= data.length and data.length <=
 *    limit.
 * 4. Regardless of whether any rows exist: 4-1. Build a deliberately non-matching
 *    filter by choosing values that are extremely unlikely to match any real
 *    audit row, such as: - actionTypes = ["**E2E_NON_EXIST_ACTION_TYPE**"] -
 *    resourceTypes = ["**E2E_NON_EXIST_RESOURCE_TYPE**"] - resourceId =
 *    RandomGenerator.alphaNumeric(32) - page = 1, limit = 10 4-2. Call the
 *    analytics index endpoint with this non-matching filter and assert: - The
 *    response structure passes typia.assert. - pagination.records === 0. -
 *    data.length === 0.
 */
export async function test_api_admin_action_audits_filter_by_action_type_and_resource(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Perform a baseline analytics query with a generic filter to inspect available data.
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "created_at",
    sortDirection: "desc" as "desc",
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const baselinePage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      { body: baselineRequest },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(baselinePage);

  // Basic sanity checks on pagination vs data length for the baseline call.
  TestValidator.predicate(
    "baseline data length must not exceed limit",
    baselinePage.data.length <= baselinePage.pagination.limit,
  );

  // 3. If at least one audit row exists, construct a targeted filter derived from that row.
  if (baselinePage.data.length > 0) {
    const seed: IShoppingMallAdminActionAudit.ISummary = baselinePage.data[0];

    const targetedRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sortBy: "created_at",
      sortDirection: "desc" as "desc",
      actionTypes: [seed.action_type],
      resourceTypes: [seed.target_type],
      resourceId: seed.target_id,
    } satisfies IShoppingMallAdminActionAudit.IRequest;

    const targetedPage: IPageIShoppingMallAdminActionAudit.ISummary =
      await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
        connection,
        { body: targetedRequest },
      );
    typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(targetedPage);

    // Assert pagination vs data length consistency under the configured limit.
    TestValidator.predicate(
      "targeted data length must not exceed limit",
      targetedPage.data.length <= targetedPage.pagination.limit,
    );

    // Assert that every returned row matches the requested filter fields.
    for (const row of targetedPage.data) {
      TestValidator.equals(
        "filtered row action_type must match requested actionTypes[0]",
        row.action_type,
        seed.action_type,
      );
      TestValidator.equals(
        "filtered row target_type must match requested resourceTypes[0]",
        row.target_type,
        seed.target_type,
      );
      TestValidator.equals(
        "filtered row target_id must match requested resourceId",
        row.target_id,
        seed.target_id,
      );
    }
  }

  // 4. Always perform a non-matching filter query and assert empty result set.
  const negativeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: ["__E2E_NON_EXIST_ACTION_TYPE__"],
    resourceTypes: ["__E2E_NON_EXIST_RESOURCE_TYPE__"],
    resourceId: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const negativePage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      { body: negativeRequest },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(negativePage);

  TestValidator.equals(
    "negative filter should return zero records",
    negativePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative filter should return empty data array",
    negativePage.data.length,
    0,
  );
}
