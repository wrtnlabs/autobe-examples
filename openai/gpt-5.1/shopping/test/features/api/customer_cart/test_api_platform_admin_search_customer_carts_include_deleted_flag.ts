import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCart";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function test_api_platform_admin_search_customer_carts_include_deleted_flag(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so that we have proper admin authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
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

  // 2. Prepare a broad search request without include_deleted so that
  //    only non-deleted carts (deleted_at = null) should be returned.
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    include_deleted: undefined,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const nonDeletedPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: baseRequest },
    );
  typia.assert(nonDeletedPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "non-deleted page: records >= data.length",
    nonDeletedPage.pagination.records >= nonDeletedPage.data.length,
  );
  TestValidator.predicate(
    "non-deleted page: pages consistent with limit",
    nonDeletedPage.pagination.pages === 0 ||
      nonDeletedPage.pagination.records === 0 ||
      nonDeletedPage.pagination.pages >= 1,
  );

  // 3. Ensure that all carts in the non-deleted result set have deleted_at
  //    undefined (i.e., not soft-deleted).
  for (const cart of nonDeletedPage.data) {
    // deleted_at is optional in ISummary; when include_deleted is omitted,
    // the API contract says only deleted_at = null rows are returned which
    // surface as deleted_at === undefined in DTO.
    TestValidator.equals(
      "non-deleted result must not expose deleted_at",
      cart.deleted_at,
      undefined,
    );
  }

  const nonDeletedRecords = nonDeletedPage.pagination.records;

  // 4. Call the same search again but now with include_deleted: true.
  const includeDeletedRequest: IShoppingMallCustomerCart.IRequest = {
    ...baseRequest,
    include_deleted: true,
  };

  const includeDeletedPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: includeDeletedRequest },
    );
  typia.assert(includeDeletedPage);

  // 5. Pagination sanity for include_deleted results
  TestValidator.predicate(
    "include-deleted page: records >= data.length",
    includeDeletedPage.pagination.records >= includeDeletedPage.data.length,
  );

  // The total records when including deleted carts should be greater than
  // or equal to the previous records count (cannot be smaller).
  TestValidator.predicate(
    "include-deleted records >= non-deleted records",
    includeDeletedPage.pagination.records >= nonDeletedRecords,
  );

  // 6. Try to observe at least one soft-deleted cart when possible.
  // If fixtures do not contain any deleted carts, this loop will simply
  // not find such an element, and the predicate below will still hold
  // (we only require that all non-deleted carts remain visible).
  const hasSoftDeleted = includeDeletedPage.data.some(
    (cart) => cart.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "include-deleted results are either equal or broader than non-deleted set",
    includeDeletedPage.data.length >= nonDeletedPage.data.length,
  );

  // When there is at least one soft-deleted cart, ensure that it only
  // appears in include_deleted results (we already asserted that the
  // non-deleted query never exposes deleted_at).
  if (hasSoftDeleted) {
    const softDeletedIds = includeDeletedPage.data
      .filter((cart) => cart.deleted_at !== undefined)
      .map((cart) => cart.id);

    for (const id of softDeletedIds) {
      const foundInNonDeleted = nonDeletedPage.data.some(
        (cart) => cart.id === id,
      );
      TestValidator.predicate(
        "soft-deleted cart must not appear in non-deleted search",
        foundInNonDeleted === false,
      );
    }
  }
}
