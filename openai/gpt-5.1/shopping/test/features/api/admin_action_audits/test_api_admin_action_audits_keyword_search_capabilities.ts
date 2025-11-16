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
 * Validate keyword-based search behavior for platform admin action audits.
 *
 * ## Business goal
 *
 * Ensure that the analytics endpoint for administrator action audit logs
 * applies the `search` field of `IShoppingMallAdminActionAudit.IRequest` as a
 * free-text filter over the summary message (and related searchable fields),
 * and that the paginated response is structurally consistent when a search term
 * matches or does not match existing audit entries.
 *
 * ## High level flow
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join. This
 *    returns an `IShoppingMallPlatformAdmin.IAuthorized` object and also sets
 *    the Authorization header on the given connection so that subsequent calls
 *    to platformAdmin endpoints are authenticated.
 * 2. Perform an initial, broad analytics search over admin action audits without
 *    specifying the `search` term, but with a wide createdFrom/createdTo window
 *    and standard pagination. This is used to:
 *
 *    - Validate that the endpoint is reachable and structurally sound, and
 *    - Obtain at least one existing audit item from which to extract a realistic
 *         search keyword.
 * 3. If the initial analytics result contains at least one audit summary:
 *
 *    - Select a representative `IShoppingMallAdminActionAudit.ISummary` object from
 *         the page.
 *    - Extract a keyword from its `summary_message` using
 *         `RandomGenerator.substring(summary_message)` to emulate a
 *         user-entered free-text search term.
 *    - Call the analytics endpoint again, this time with the `search` field set to
 *         the derived keyword and the same time window and pagination
 *         parameters.
 *    - Assert that:
 *
 *         - The response structure matches `IPageIShoppingMallAdminActionAudit.ISummary`.
 *         - `pagination.current` equals `page - 1` (0-based vs 1-based convention).
 *         - `pagination.limit` equals the requested limit.
 *         - `pagination.records` is greater than or equal to `data.length`.
 *         - Every `summary_message` in `data` contains the keyword substring, confirming
 *                   that the `search` filter narrows down to matching entries.
 * 4. Optionally, issue a third analytics call with a synthetic search term that is
 *    extremely unlikely to exist (e.g., a random alphanumeric token prefixed
 *    with a marker) and assert that:
 *
 *    - The response is structurally valid.
 *    - `data.length` is 0, and (when reasonable) `pagination.records` is 0 as well.
 *
 * ## Edge conditions
 *
 * - If the initial analytics call returns no audit data (empty `data` or
 *   `pagination.records === 0`), the test cannot perform keyword-based
 *   narrowing. In that case, it only validates that the endpoint responds with
 *   a well-typed, paginated object and then exits early.
 * - No attempt is made to create or mutate audit records because no such API is
 *   available in the provided materials; the test is purely read-only on the
 *   analytics side.
 */
export async function test_api_admin_action_audits_keyword_search_capabilities(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain an authenticated connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://landing.example.com/ops",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a broad createdFrom/createdTo window (e.g., last 7 days).
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - sevenDaysMs).toISOString();
  const to = now.toISOString();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const initialRequestBody = {
    page,
    limit,
    createdFrom: from as string & tags.Format<"date-time">,
    createdTo: to as string & tags.Format<"date-time">,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const initialPage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      { body: initialRequestBody },
    );
  typia.assert(initialPage);

  // Basic structure and pagination sanity checks.
  TestValidator.predicate(
    "initial pagination current is non-negative",
    initialPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "initial pagination limit is non-negative",
    initialPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "initial pagination records is non-negative",
    initialPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "initial pagination pages is non-negative",
    initialPage.pagination.pages >= 0,
  );

  // If there is no data, we can only validate structural correctness and exit.
  if (initialPage.data.length === 0 || initialPage.pagination.records === 0) {
    TestValidator.equals(
      "when no audit data, data length must be 0",
      initialPage.data.length,
      0,
    );
    return;
  }

  // 3. Derive a keyword from an existing audit summary.
  const sampleAudit: IShoppingMallAdminActionAudit.ISummary =
    initialPage.data[0];
  typia.assert(sampleAudit);

  const keywordSource = sampleAudit.summary_message;
  TestValidator.predicate(
    "summary_message used for keyword extraction is non-empty",
    keywordSource.length > 0,
  );

  const keywordRaw = RandomGenerator.substring(keywordSource);
  const keyword = keywordRaw.length > 0 ? keywordRaw : keywordSource;

  // 4. Search with the derived keyword and validate narrowing behavior.
  const keywordRequestBody = {
    page,
    limit,
    createdFrom: from as string & tags.Format<"date-time">,
    createdTo: to as string & tags.Format<"date-time">,
    search: keyword,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const keywordPage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      { body: keywordRequestBody },
    );
  typia.assert(keywordPage);

  // Pagination coherence: current should be page - 1, limit preserved.
  TestValidator.equals(
    "keyword page pagination.current equals page - 1",
    keywordPage.pagination.current,
    page - 1,
  );
  TestValidator.equals(
    "keyword page pagination.limit equals requested limit",
    keywordPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "keyword page records is at least data length",
    keywordPage.pagination.records >= keywordPage.data.length,
  );

  // If keyword search returns any data, all must match the keyword behavior.
  if (keywordPage.data.length > 0) {
    for (const audit of keywordPage.data) {
      typia.assert<IShoppingMallAdminActionAudit.ISummary>(audit);
      TestValidator.predicate(
        "each summary_message contains the keyword substring",
        audit.summary_message.includes(keyword),
      );
    }
  }

  // 5. Optional negative search scenario with a synthetic, unlikely keyword.
  const impossibleKeyword = `__unlikely__${RandomGenerator.alphaNumeric(24)}`;

  const negativeRequestBody = {
    page,
    limit,
    createdFrom: from as string & tags.Format<"date-time">,
    createdTo: to as string & tags.Format<"date-time">,
    search: impossibleKeyword,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const negativePage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      { body: negativeRequestBody },
    );
  typia.assert(negativePage);

  TestValidator.predicate(
    "negative keyword search returns no data items",
    negativePage.data.length === 0,
  );
  TestValidator.predicate(
    "negative keyword search has records count not less than data length",
    negativePage.pagination.records >= negativePage.data.length,
  );
}
