import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartMergeEvent";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Verify that cart merge events search endpoint requires admin authentication
 * and rejects unauthenticated or customer-authenticated access.
 *
 * Business workflow:
 *
 * 1. Prepare a minimal valid search request body for cart merge events.
 * 2. Call PATCH /shoppingMall/admin/carts/mergeEvents without Authorization and
 *    expect failure.
 * 3. Join as an admin (POST /auth/admin/join) and call the same endpoint
 *    successfully using the admin token.
 * 4. Join as a customer (POST /auth/customer/join) so the connection now holds a
 *    customer token; call the admin endpoint and expect failure.
 */
export async function test_api_admin_cart_merge_events_authentication_required(
  connection: api.IConnection,
) {
  // 1. Prepare minimal valid search body
  const searchBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  // 2. Unauthenticated access: create connection clone without Authorization
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to cart merge events must fail",
    async () => {
      await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
        unauthenticated,
        {
          body: searchBody,
        },
      );
    },
  );

  // 3. Admin authenticated access: admin join then search
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminPage: IPageIShoppingMallCartMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(adminPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.current should be >= 0",
    adminPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    adminPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    adminPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    adminPage.pagination.pages >= 0,
  );

  // Data-level sanity: counts must be non-negative
  for (const event of adminPage.data) {
    TestValidator.predicate(
      "merged_item_count should be >= 0",
      event.merged_item_count >= 0,
    );
    TestValidator.predicate(
      "dropped_item_count should be >= 0",
      event.dropped_item_count >= 0,
    );
  }

  // 4. Customer authenticated access: customer join then attempt admin search
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  await TestValidator.error(
    "customer-authenticated access to admin cart merge events must fail",
    async () => {
      await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
        connection,
        {
          body: searchBody,
        },
      );
    },
  );
}
