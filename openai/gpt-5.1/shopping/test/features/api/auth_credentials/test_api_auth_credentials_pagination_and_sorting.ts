import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_auth_credentials_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Prepare dataset: multiple customers, one seller, one platform admin
  const createdCredentialIds: string[] = [];

  // Helper to register a customer
  const createCustomer = async () => {
    const joinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      ip: null,
      href: "https://customer.example.com/join",
      referrer: "https://customer.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const customerAuthorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);
  };

  // Helper to register a seller
  const createSeller = async () => {
    const sellerBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest;

    const sellerAuthorized: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: sellerBody,
      });
    typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);
  };

  // Helper to register a platform admin
  const createPlatformAdmin = async () => {
    const adminBody = {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminJoin.IRequest;

    const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.join(connection, {
        body: adminBody,
      });
    typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);
  };

  // Create several credentials
  await createCustomer();
  await createCustomer();
  await createCustomer();
  await createSeller();
  await createPlatformAdmin();

  // 2. Fetch first page with small limit and created_at desc
  const limit = 2;
  const firstRequestBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: 0 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const firstPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: firstRequestBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic pagination assertions for first page
  TestValidator.equals(
    "first page current index should be 0",
    firstPagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit should equal requested limit",
    firstPagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page data length must be <= limit",
    firstData.length <= limit,
  );

  // Verify created_at ordering (desc)
  for (let i = 1; i < firstData.length; i++) {
    const prev = new Date(firstData[i - 1].created_at).getTime();
    const curr = new Date(firstData[i].created_at).getTime();
    TestValidator.predicate(
      `created_at must be non-increasing at index ${i}`,
      prev >= curr,
    );
  }

  // Track ids from first page
  for (const cred of firstData) {
    createdCredentialIds.push(cred.id);
  }

  const totalRecords = firstPagination.records;

  // 3. Fetch second page with same sort and limit
  const secondRequestBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const secondPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: secondRequestBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second page current index should be 1",
    secondPagination.current,
    1,
  );
  TestValidator.equals(
    "second page limit should equal requested limit",
    secondPagination.limit,
    limit,
  );
  TestValidator.predicate(
    "second page data length must be <= limit",
    secondData.length <= limit,
  );

  // Ensure no id overlap between first and second pages
  const firstIds = firstData.map((c) => c.id);
  const secondIds = secondData.map((c) => c.id);
  const overlappingIds = secondIds.filter((id) => firstIds.includes(id));
  TestValidator.equals(
    "no overlapping ids between first and second pages",
    overlappingIds.length,
    0,
  );

  // Collect ids from second page
  for (const cred of secondData) {
    createdCredentialIds.push(cred.id);
  }

  // 4. Validate that totalRecords is at least the number of collected ids
  TestValidator.predicate(
    "total records should be >= collected page ids",
    totalRecords >= createdCredentialIds.length,
  );

  // 5. Request a page beyond the available pages and expect empty data
  const beyondPageIndex = secondPagination.pages + 5;
  const beyondRequestBody = {
    actor_type: undefined,
    login_identifier: undefined,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: beyondPageIndex as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const beyondPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: beyondRequestBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(beyondPage);

  const beyondPagination = beyondPage.pagination;
  const beyondData = beyondPage.data;

  TestValidator.equals(
    "beyond page current must equal requested index",
    beyondPagination.current,
    beyondPageIndex,
  );
  TestValidator.equals(
    "beyond page limit should equal requested limit",
    beyondPagination.limit,
    limit,
  );
  TestValidator.equals(
    "beyond page records should equal totalRecords",
    beyondPagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "beyond page pages should match from previous pagination",
    beyondPagination.pages,
    secondPagination.pages,
  );
  TestValidator.equals(
    "beyond page data should be empty",
    beyondData.length,
    0,
  );
}
