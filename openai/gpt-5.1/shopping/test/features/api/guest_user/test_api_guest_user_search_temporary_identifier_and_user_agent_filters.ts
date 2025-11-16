import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestuser";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate guest user search filtering by temporary_identifier and user_agent.
 *
 * Business purpose: Platform administrators need to locate guest identities
 * based on key tracking fields such as device identifiers and user agent
 * strings for debugging, analytics, or incident investigation. This test
 * ensures that the administrative guest user search endpoint correctly filters
 * by temporary_identifier and user_agent and that pagination behaves sanely for
 * simple cases.
 *
 * Steps:
 *
 * 1. Bootstrap a platform administrator by calling POST /auth/platformAdmin/join.
 *    This also configures the connection with a valid admin Authorization token
 *    via the SDK, so subsequent platformAdmin-scoped calls are authenticated.
 * 2. Under the platform admin context, create three guest user records via POST
 *    /shoppingMall/platformAdmin/guestUsers with controlled
 *    temporary_identifier and user_agent values:
 *
 *    - Guest A: temporary_identifier = "device-A", user_agent = "Agent-X".
 *    - Guest B: temporary_identifier = "device-B", user_agent = "Agent-Y".
 *    - Guest C: temporary_identifier = "device-C", user_agent = "Agent-X".
 * 3. Call PATCH /shoppingMall/platformAdmin/guestUsers with an
 *    IShoppingMallGuestUser.IRequest body that filters by temporary_identifier
 *    = "device-B" and sets page/limit to small integers (e.g., page = 1, limit
 *    = 10). Verify:
 *
 *    - Exactly one summary record is returned.
 *    - The returned guest id matches the created Guest B id.
 * 4. Call PATCH /shoppingMall/platformAdmin/guestUsers again with a body that
 *    filters by user_agent = "Agent-X" and page/limit the same as above.
 *    Verify:
 *
 *    - Exactly two summary records are returned.
 *    - The returned guest ids are exactly the set {Guest A.id, Guest C.id}
 *         (order-insensitive) and that Guest B.id is not present.
 * 5. Optionally validate the free-form search field by invoking the same index
 *    endpoint with search set to a value that uniquely identifies one of the
 *    guests. Since the response type for index is
 *    IPageIShoppingMallGuestuser.ISummary, which only exposes id, displayName,
 *    createdAt, and updatedAt, we use the known id as the search term.
 *    Specifically:
 *
 *    - Call index with body: { search: guestC.id, page: 1, limit: 10 }.
 *    - Verify that Guest C appears in the data list.
 *    - Optionally assert that all returned summaries have id equal to Guest C.id (if
 *         server performs exact id-based search) by checking that the set of
 *         ids in the response is {guestC.id}.
 *
 * Implementation constraints:
 *
 * - Use only provided DTOs and API functions (no fictional endpoints).
 * - Use typia.assert on all non-void API responses.
 * - Use TestValidator.equals / TestValidator.notEquals / TestValidator.predicate
 *   with descriptive titles for logical assertions.
 * - Never manipulate connection.headers directly; rely on SDK auth handling.
 */
export async function test_api_guest_user_search_temporary_identifier_and_user_agent_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an authenticated admin session
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create three deterministic guest users A, B, C
  const guestABody = {
    temporary_identifier: "device-A",
    user_agent: "Agent-X",
  } satisfies IShoppingMallGuestUser.ICreate;
  const guestA: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestABody },
    );
  typia.assert(guestA);

  const guestBBody = {
    temporary_identifier: "device-B",
    user_agent: "Agent-Y",
  } satisfies IShoppingMallGuestUser.ICreate;
  const guestB: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestBBody },
    );
  typia.assert(guestB);

  const guestCBody = {
    temporary_identifier: "device-C",
    user_agent: "Agent-X",
  } satisfies IShoppingMallGuestUser.ICreate;
  const guestC: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestCBody },
    );
  typia.assert(guestC);

  // 3. Search by temporary_identifier = "device-B"
  const searchByTempIdBody = {
    page: 1,
    limit: 10,
    temporary_identifier: "device-B",
  } satisfies IShoppingMallGuestUser.IRequest;

  const byTempIdPage: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      { body: searchByTempIdBody },
    );
  typia.assert(byTempIdPage);

  TestValidator.equals(
    "search by temporary_identifier returns exactly one guest",
    byTempIdPage.data.length,
    1,
  );

  const foundByTempId = byTempIdPage.data[0];
  TestValidator.equals(
    "search by temporary_identifier returns Guest B id",
    foundByTempId.id,
    guestB.id,
  );

  // 4. Search by user_agent = "Agent-X" (should return Guest A and Guest C)
  const searchByUserAgentBody = {
    page: 1,
    limit: 10,
    user_agent: "Agent-X",
  } satisfies IShoppingMallGuestUser.IRequest;

  const byUserAgentPage: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      { body: searchByUserAgentBody },
    );
  typia.assert(byUserAgentPage);

  TestValidator.equals(
    "search by user_agent Agent-X returns exactly two guests",
    byUserAgentPage.data.length,
    2,
  );

  const idsByUserAgent = byUserAgentPage.data.map((g) => g.id);

  TestValidator.predicate(
    "search by user_agent Agent-X includes Guest A",
    idsByUserAgent.includes(guestA.id),
  );
  TestValidator.predicate(
    "search by user_agent Agent-X includes Guest C",
    idsByUserAgent.includes(guestC.id),
  );
  TestValidator.predicate(
    "search by user_agent Agent-X does not include Guest B",
    idsByUserAgent.includes(guestB.id) === false,
  );

  // 5. Optional: free-form search using Guest C id as the search term
  const searchByIdBody = {
    page: 1,
    limit: 10,
    search: guestC.id,
  } satisfies IShoppingMallGuestUser.IRequest;

  const bySearchPage: IPageIShoppingMallGuestuser.ISummary =
    await api.functional.shoppingMall.platformAdmin.guestUsers.index(
      connection,
      { body: searchByIdBody },
    );
  typia.assert(bySearchPage);

  const searchIds = bySearchPage.data.map((g) => g.id);

  TestValidator.predicate(
    "search by id string includes Guest C",
    searchIds.includes(guestC.id),
  );

  // If the backend performs strict id-based search, all ids should equal guestC.id.
  // We assert this condition leniently: if there are multiple results,
  // they should not contradict Guest C's presence, but we do not fail if
  // extras are present as long as Guest C is returned.
}
