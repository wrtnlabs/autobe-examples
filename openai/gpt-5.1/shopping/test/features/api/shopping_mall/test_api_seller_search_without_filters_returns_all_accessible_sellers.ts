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

export async function test_api_seller_search_without_filters_returns_all_accessible_sellers(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator so that platformAdmin-scoped
  //    operations (like brand creation) can be executed. The join call also
  //    configures Authorization headers on the shared connection via SDK
  //    side effects.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create at least one brand as a catalog prerequisite. While seller
  //    search itself does not require a brand, the scenario asks to
  //    initialize the catalog for seller–brand associations.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shopping-mall.test/logo/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Call seller search with minimal request body: page and limit only,
  //    omitting all filters and sort directives to exercise default
  //    behavior.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const minimalRequestBody = {
    page,
    limit,
  } satisfies IShoppingMallSeller.IRequest;

  const firstPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(connection, {
      body: minimalRequestBody,
    });
  typia.assert(firstPage);

  const pagination: IPage.IPagination = firstPage.pagination;
  const sellers = firstPage.data;

  // 4. Pagination invariants for the authenticated call.
  TestValidator.predicate(
    "pagination.records should be >= number of returned sellers (auth)",
    pagination.records >= sellers.length,
  );

  TestValidator.predicate(
    "pagination.limit should be positive (auth)",
    pagination.limit > 0,
  );

  // Effective limit must not exceed the requested limit, even if backend
  // applies its own default or cap.
  TestValidator.predicate(
    "effective limit should not exceed requested limit (auth)",
    pagination.limit <= limit,
  );

  // Request page is 1-based while IPagination.current is 0-based. For
  // page=1, current should be 0.
  TestValidator.predicate(
    "pagination.current should reflect 0-based index for requested page (auth)",
    pagination.current === 0,
  );

  // 5. If there are sellers, rely on typia.assert to ensure each entry
  //    conforms to IShoppingMallSeller.ISummary.
  if (sellers.length > 0) {
    for (const seller of sellers) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }

  // 6. Exercise default sorting behavior by comparing the default result
  //    against an explicitly sorted result when there are enough records.
  if (sellers.length > 1) {
    const sortedDescBody = {
      page,
      limit,
      sort_field: "created_at" as const,
      sort_order: "desc" as const,
    } satisfies IShoppingMallSeller.IRequest;

    const sortedDesc: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.sellers.index(connection, {
        body: sortedDescBody,
      });
    typia.assert(sortedDesc);

    const baseIds = firstPage.data.map((x) => x.id);
    const sortedIds = sortedDesc.data.map((x) => x.id);

    TestValidator.equals(
      "explicit created_at desc sort should return same IDs as default page (auth)",
      sortedIds,
      baseIds,
    );
  }

  // 7. Invoke seller search without any pagination or filter fields to
  //    exercise server-side default page and limit.
  const defaultRequestBody = {} satisfies IShoppingMallSeller.IRequest;

  const defaultPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(connection, {
      body: defaultRequestBody,
    });
  typia.assert(defaultPage);

  const defaultPagination: IPage.IPagination = defaultPage.pagination;

  TestValidator.predicate(
    "default pagination.limit should be positive (auth)",
    defaultPagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination.records should be >= data length (auth)",
    defaultPagination.records >= defaultPage.data.length,
  );
  TestValidator.predicate(
    "default pagination.current should be first page (auth)",
    defaultPagination.current === 0,
  );

  // 8. Create an unauthenticated connection by cloning the base connection
  //    and assigning an empty headers object at instantiation time. Do not
  //    mutate connection.headers directly to respect SDK header management.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Call the same seller search with minimal body on the unauthenticated
  // connection. The endpoint has no authorizationActors and should succeed.
  const unauthenticatedPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(unauthenticatedConnection, {
      body: minimalRequestBody,
    });
  typia.assert(unauthenticatedPage);

  const unauthPagination: IPage.IPagination = unauthenticatedPage.pagination;

  TestValidator.predicate(
    "pagination.records should be >= data length (unauth)",
    unauthPagination.records >= unauthenticatedPage.data.length,
  );
  TestValidator.predicate(
    "pagination.limit should be positive (unauth)",
    unauthPagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative (unauth)",
    unauthPagination.current >= 0,
  );
}
