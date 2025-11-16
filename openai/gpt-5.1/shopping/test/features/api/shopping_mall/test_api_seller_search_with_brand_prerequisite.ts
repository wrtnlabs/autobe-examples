import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller search with pagination and basic status filter once a brand
 * exists, confirming that the endpoint works without authentication and returns
 * a well-typed paginated seller summary list.
 *
 * Business flow:
 *
 * 1. Bootstrap a platform admin account using POST /auth/platformAdmin/join so
 *    that we can call privileged catalog operations.
 * 2. As the platform admin, create at least one brand through POST
 *    /shoppingMall/platformAdmin/brands to satisfy the catalog brand
 *    prerequisite for seller association (even though this test cannot verify
 *    actual brand linkage because no seller-creation API is exposed).
 * 3. Create an unauthenticated connection by cloning the incoming connection and
 *    overriding headers with an empty object, ensuring there is no
 *    Authorization header for the seller search call.
 * 4. Invoke PATCH /shoppingMall/sellers via
 *    api.functional.shoppingMall.sellers.index using an
 *    IShoppingMallSeller.IRequest body that requests the first page (page=1,
 *    limit=5), sorted by created_at desc, and filtered by a sample status value
 *    such as "active".
 * 5. Assert that the response matches IPageIShoppingMallSeller.ISummary and that
 *    pagination metadata (current, limit, records, pages) is consistent with
 *    the size of the data array.
 * 6. If any sellers are returned, ensure that every seller summary has an id,
 *    email, store_name, and status, and that all statuses match the requested
 *    filter value.
 * 7. Because the seller summary DTO does not expose created_at, we cannot inspect
 *    actual timestamps; instead, we assert deterministic ordering by issuing
 *    the same request twice and verifying that both response payloads are
 *    deeply equal, implying a stable sort order.
 * 8. The fact that the PATCH /shoppingMall/sellers call succeeds on an
 *    unauthenticated connection serves as evidence that this endpoint does not
 *    require Authorization headers.
 */
export async function test_api_seller_search_with_brand_prerequisite(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an authorized admin session
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one brand as the platform admin
  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Build seller search request body for first-page, status-filtered search
  const requestStatus = "active";
  const sellerRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "created_at",
    sort_order: "desc",
    status: requestStatus,
  } satisfies IShoppingMallSeller.IRequest;

  // 5. Call the seller search endpoint twice to check stability and pagination
  const firstPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(publicConnection, {
      body: sellerRequest,
    });
  typia.assert(firstPage);

  const secondPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(publicConnection, {
      body: sellerRequest,
    });
  typia.assert(secondPage);

  // 5-1. Basic pagination metadata consistency checks on firstPage
  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, data array is empty",
      firstPage.data.length,
      0,
    );
    TestValidator.equals("when no records, pages is zero", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "when there are records, at least one page",
      () => pagination.pages >= 1,
    );
    TestValidator.predicate(
      "current page index within valid range",
      () =>
        pagination.current >= 0 &&
        (pagination.pages === 0 || pagination.current < pagination.pages),
    );
    TestValidator.predicate(
      "page size does not exceed limit",
      () => firstPage.data.length <= pagination.limit,
    );
  }

  // 5-2. Validate each seller summary and status filter if any seller exists
  if (firstPage.data.length > 0) {
    for (const seller of firstPage.data) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
      TestValidator.equals(
        "seller status matches requested filter",
        seller.status,
        requestStatus,
      );
    }
  }

  // 6. Deterministic ordering: repeated call with same request should yield same data
  TestValidator.equals(
    "repeated seller search with same request yields identical data",
    firstPage.data,
    secondPage.data,
  );
}
