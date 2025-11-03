import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin sign up (required for authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongP@ssword123", // secure password assumed
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Prepare listing filter parameters
  const emailFilter =
    adminEmail.substring(0, adminEmail.indexOf("@")) || "admin";
  const storeNameFilter = RandomGenerator.name(1);
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = now.toISOString();

  const page = 1;
  const limit = 10;

  const sortBy: IShoppingMallSeller.IRequest["sort_by"] = "created_at";
  const sortOrder: IShoppingMallSeller.IRequest["sort_order"] = "desc";

  const listRequestBody = {
    email: emailFilter,
    store_name: storeNameFilter,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    page,
    limit,
    sort_by: sortBy,
    sort_order: sortOrder,
  } satisfies IShoppingMallSeller.IRequest;

  // 3. Call seller listing API
  const response = await api.functional.shoppingMall.admin.sellers.indexSellers(
    connection,
    {
      body: listRequestBody,
    },
  );

  // 4. Assert response structure
  typia.assert(response);

  // 5. Assert pagination metadata integrity
  const { pagination } = response;
  TestValidator.predicate(
    "pagination current page matches request",
    pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    pagination.pages >= 0,
  );

  // 6. Assert each seller matches filters
  for (const seller of response.data) {
    typia.assert(seller);
    TestValidator.predicate(
      `seller email includes filter '${emailFilter}'`,
      seller.email.toLowerCase().includes(emailFilter.toLowerCase()),
    );
    TestValidator.predicate(
      `seller store_name includes filter '${storeNameFilter}'`,
      seller.store_name.toLowerCase().includes(storeNameFilter.toLowerCase()),
    );
    TestValidator.predicate(
      `seller created_at >= created_at_from filter`,
      seller.created_at >= createdAtFrom,
    );
    TestValidator.predicate(
      `seller created_at <= created_at_to filter`,
      seller.created_at <= createdAtTo,
    );
  }

  // 7. Assert sorting is by created_at descending
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1];
    const curr = response.data[i];
    TestValidator.predicate(
      `seller list sorted by created_at desc`,
      prev.created_at >= curr.created_at,
    );
  }
}
