import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_sales_snapshots_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user sign-up and login
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "1234",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreateBody.email,
      password: adminCreateBody.password,
      href: "https://admin.test/page",
      referrer: "https://referrer.test/page",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 2: Seller user sign-up and login
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "1234",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerUser: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerUser);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://seller.test/page",
      referrer: "https://referrer.test/page",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 3: Create a shopping mall channel
  const channelCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: channelCreateBody,
      },
    );
  typia.assert(channel);

  // Step 4: Create a shopping mall product under seller context
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // Step 5: Search sales snapshots as admin using various filters
  // Using filters that relate to seller and date range
  const today = new Date();
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);

  const salesSnapshotsRequest = {
    page: 1,
    limit: 20,
    search: undefined,
    orderBy: "snapshot_date",
    desc: true,
    filter: {
      snapshot_date_start: oneMonthAgo.toISOString().slice(0, 10),
      snapshot_date_end: today.toISOString().slice(0, 10),
      min_units_sold: 0,
      max_units_sold: 1000000,
      min_revenue: 0,
      max_revenue: 1000000000,
      seller_id: sellerUser.id,
    },
  } satisfies IShoppingMallSalesSnapshot.IRequest;

  const snapshotsPage: IPageIShoppingMallSalesSnapshot.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallSalesSnapshots.index(
      connection,
      {
        body: salesSnapshotsRequest,
      },
    );

  typia.assert(snapshotsPage);

  // Validate pagination values
  TestValidator.predicate(
    "pagination current page is 1",
    snapshotsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    snapshotsPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsPage.pagination.records >= 0,
  );

  // Validate snapshot entries
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot created_at is ISO date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
  }
}
