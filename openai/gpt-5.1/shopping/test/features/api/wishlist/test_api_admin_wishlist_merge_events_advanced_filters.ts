import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

export async function test_api_admin_wishlist_merge_events_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin to access admin search endpoint
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare guest and customers to indirectly generate merge events
  // 2.1 Create a guest user identity
  const guest: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        external_reference: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallGuestUser.IJoin,
    });
  typia.assert(guest);

  // 2.2 Create two customers (A and B)
  const customerJoinBase = (
    email: string & tags.Format<"email">,
  ): IShoppingMallCustomerJoin.IRequest => ({
    email,
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test.local/" as string & tags.Format<"uri">,
  });

  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBase(customerAEmail),
    });
  typia.assert(customerA);

  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBase(customerBEmail),
    });
  typia.assert(customerB);

  // NOTE: There is no explicit API to link guest wishlists to customers or
  // to trigger wishlist merge events, so we cannot deterministically create
  // specific merge audits. Instead, we assume that the backend may create
  // such events as part of other flows, and we focus this test on the
  // filtering behavior of the admin search API over whatever data exists.

  // 3. Authenticate as admin again to ensure admin context (join already set header)
  const adminLoginBody = {
    email: admin.email,
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Helper: perform a filtered search and assert each returned row satisfies predicate
  const assertFilter = async (
    title: string,
    requestBody: IShoppingMallWishlistMergeEvent.IRequest,
    predicate: (row: IShoppingMallWishlistMergeEvent.ISummary) => boolean,
  ): Promise<void> => {
    const page: IPageIShoppingMallWishlistMergeEvent.ISummary =
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        connection,
        { body: requestBody },
      );
    typia.assert(page);

    // Basic pagination sanity: page and limit should be non-negative
    TestValidator.predicate(
      `${title} - pagination current non-negative`,
      page.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination limit positive`,
      page.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination pages non-negative`,
      page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination records non-negative`,
      page.pagination.records >= 0,
    );

    // Every row must satisfy the logical predicate for the filter
    for (const row of page.data) {
      TestValidator.predicate(
        `${title} - row satisfies predicate`,
        predicate(row),
      );
    }
  };

  // 4. Capture roughly "now" as a temporal reference for created_at window tests
  const nowIso = new Date().toISOString();

  // 5. Filter: source_actor_type = "guestuser"
  await assertFilter(
    "filter by source_actor_type=guestuser",
    {
      source_actor_type: "guestuser",
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_merged_item_count: null,
      max_merged_item_count: null,
      min_dropped_item_count: null,
      max_dropped_item_count: null,
      reason_query: null,
      created_from: null,
      created_to: null,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) => row.source_actor_type === "guestuser",
  );

  // 6. Filter: high merged_item_count (min_merged_item_count)
  await assertFilter(
    "filter by high merged_item_count",
    {
      source_actor_type: null,
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_merged_item_count: 5 as number & tags.Type<"int32">,
      max_merged_item_count: null,
      min_dropped_item_count: null,
      max_dropped_item_count: null,
      reason_query: null,
      created_from: null,
      created_to: null,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) => row.merged_item_count >= 5,
  );

  // 7. Filter: high dropped_item_count
  await assertFilter(
    "filter by high dropped_item_count",
    {
      source_actor_type: null,
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_dropped_item_count: 3 as number & tags.Type<"int32">,
      max_dropped_item_count: null,
      min_merged_item_count: null,
      max_merged_item_count: null,
      reason_query: null,
      created_from: null,
      created_to: null,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) => row.dropped_item_count >= 3,
  );

  // 8. Filter: reason_query substring search
  // We cannot guarantee specific reason strings exist, but we can still call
  // the API with a synthetic query and then only assert that any returned row
  // (if data exists) contains that substring in reason.
  const reasonQuery = "merge";
  await assertFilter(
    "filter by reason_query",
    {
      source_actor_type: null,
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_merged_item_count: null,
      max_merged_item_count: null,
      min_dropped_item_count: null,
      max_dropped_item_count: null,
      reason_query: reasonQuery,
      created_from: null,
      created_to: null,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) =>
      row.reason === null || row.reason === undefined
        ? true
        : row.reason.includes(reasonQuery),
  );

  // 9. Filter: created_at range
  // Use a wide window that includes "now"; this primarily asserts that when
  // created_from/created_to are provided, all rows have created_at within it.
  const fromIso = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const toIso = nowIso;
  await assertFilter(
    "filter by created_at range",
    {
      source_actor_type: null,
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_merged_item_count: null,
      max_merged_item_count: null,
      min_dropped_item_count: null,
      max_dropped_item_count: null,
      reason_query: null,
      created_from: fromIso,
      created_to: toIso,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) => row.created_at >= fromIso && row.created_at <= toIso,
  );

  // 10. Combined filter: guestuser source + min merged + reason query
  await assertFilter(
    "combined filter: guestuser + min merged + reason_query",
    {
      source_actor_type: "guestuser",
      target_actor_type: null,
      source_guestuser_id: null,
      target_customer_id: null,
      source_wishlist_id: null,
      target_wishlist_id: null,
      min_merged_item_count: 1 as number & tags.Type<"int32">,
      max_merged_item_count: null,
      min_dropped_item_count: null,
      max_dropped_item_count: null,
      reason_query: reasonQuery,
      created_from: null,
      created_to: null,
      page: 0,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    },
    (row) => {
      const reasonOk =
        row.reason === null || row.reason === undefined
          ? true
          : row.reason.includes(reasonQuery);
      return (
        row.source_actor_type === "guestuser" &&
        row.merged_item_count >= 1 &&
        reasonOk
      );
    },
  );
}
