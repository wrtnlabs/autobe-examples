import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_sellers_list_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller logs in
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    href: "https://test.client.app/",
    referrer: "https://test.referrer.app/",
  } satisfies IShoppingMallSeller.ILogin;

  const loginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Retrieve sellers list filtered and paginated
  // Use pagination parameters within allowed range
  const requestBody = {
    email: undefined,
    store_name: undefined,
    created_at_from: undefined,
    created_at_to: undefined,
    page: 1,
    limit: 20,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallSeller.IRequest;

  const sellersPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.seller.sellers.indexSellers(connection, {
      body: requestBody,
    });
  typia.assert(sellersPage);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination has positive current page",
    sellersPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is within allowed bounds",
    sellersPage.pagination.limit > 0 && sellersPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages is positive or zero",
    sellersPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    sellersPage.pagination.records >= 0,
  );

  // Validate data array
  TestValidator.predicate("data is an array", Array.isArray(sellersPage.data));

  for (const seller of sellersPage.data) {
    typia.assert(seller); // Validate seller summary structure
    TestValidator.predicate(
      "seller id is non-empty string",
      typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller email format",
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(seller.email),
    );
    TestValidator.predicate(
      "seller store_name is not empty string",
      typeof seller.store_name === "string" && seller.store_name.length > 0,
    );
    // created_at and updated_at should be ISO date-time strings
    TestValidator.predicate(
      "created_at valid ISO string",
      !Number.isNaN(Date.parse(seller.created_at)),
    );
    TestValidator.predicate(
      "updated_at valid ISO string",
      !Number.isNaN(Date.parse(seller.updated_at)),
    );
  }
}
