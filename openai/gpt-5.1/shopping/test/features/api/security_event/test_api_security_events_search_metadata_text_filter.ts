import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Validate metadata free-text filtering of security events for platform admins.
 *
 * Business context: Platform administrators use the security events dashboard
 * to investigate anomalous behavior, correlate risk rule triggers, and review
 * authentication anomalies. A key capability is the ability to filter events by
 * metadata (for example rule identifiers, correlation IDs, or error codes)
 * through a free-text search field.
 *
 * This test exercises the platformAdmin securityEvents search endpoint using
 * the metadata filter, verifying both non-empty and empty search behaviors.
 *
 * Steps:
 *
 * 1. Bootstrap an authorized platform admin session via POST
 *    /auth/platformAdmin/join. The SDK automatically stores the access token
 *    into the connection headers so subsequent platformAdmin calls are
 *    authenticated.
 * 2. Perform a metadata search expected to yield some events (depending on seeded
 *    data), using a realistic term such as a generic fragment that is likely to
 *    appear somewhere in metadata fields.
 * 3. Validate the pagination contract for the non-empty search:
 *
 *    - The response must conform to IPageIShoppingMallSecurityEvent.ISummary.
 *    - If any events are returned, pagination.records must be > 0 and
 *         pagination.pages must be >= 1.
 *    - The current page index must be within [0, pages - 1] when pages > 0.
 * 4. Perform a metadata search using a random, high-entropy string to minimize the
 *    chance of matching any event metadata.
 * 5. Validate the empty-state contract for the unmatched search:
 *
 *    - Data.length must be 0.
 *    - Pagination.records must be 0.
 *    - Pagination.pages must be 0.
 *
 * Notes:
 *
 * - Because tests cannot create arbitrary security events directly, this scenario
 *   is written to be resilient across environments with different seeding
 *   strategies by not asserting that the first search must return non-empty
 *   data; instead, it asserts self-consistency between data length and
 *   pagination metadata.
 */
export async function test_api_security_events_search_metadata_text_filter(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authorized session.
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Prepare metadata search terms.
  // A generic term that might appear in seeded metadata.
  const likelyMetadataTerm: string = "login";
  // A highly unlikely term to ensure empty results.
  const unlikelyMetadataTerm: string = `__unlikely_metadata_${RandomGenerator.alphaNumeric(16)}__`;

  // Helper to build a base request with page/limit.
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies Pick<IShoppingMallSecurityEvent.IRequest, "page" | "limit">;

  // 3. First search with a likely metadata term.
  const firstSearchRequest = {
    ...baseRequest,
    metadata: likelyMetadataTerm,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const firstPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      { body: firstSearchRequest },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic consistency checks between pagination metadata and data array.
  TestValidator.predicate(
    "first search: records should be >= data length",
    firstPagination.records >= firstData.length,
  );

  if (firstPagination.records === 0) {
    TestValidator.equals(
      "first search: no records implies empty data array",
      firstData.length,
      0,
    );
    TestValidator.equals(
      "first search: no records implies zero pages",
      firstPagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "first search: positive records implies at least one page",
      firstPagination.pages >= 1,
    );
    TestValidator.predicate(
      "first search: current page index within valid range",
      firstPagination.current >= 0 &&
        firstPagination.current <= firstPagination.pages - 1,
    );
  }

  // 4. Second search with an unlikely metadata term expecting empty results.
  const secondSearchRequest = {
    ...baseRequest,
    metadata: unlikelyMetadataTerm,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const secondPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      { body: secondSearchRequest },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second search: metadata filter with unlikely term returns empty data",
    secondData.length,
    0,
  );
  TestValidator.equals(
    "second search: no records for unlikely metadata term",
    secondPagination.records,
    0,
  );
  TestValidator.equals(
    "second search: zero pages when no records",
    secondPagination.pages,
    0,
  );
}
