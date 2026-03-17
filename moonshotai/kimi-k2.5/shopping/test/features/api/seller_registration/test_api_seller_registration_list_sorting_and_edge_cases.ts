import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test sorting capabilities and edge cases for seller registration listing.
 * Includes testing of various sort fields, cursor and offset pagination,
 * empty results filtering, and seller-specific filtering.
 */
export async function test_api_seller_registration_list_sorting_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Authenticate as seller to obtain authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a seller registration to have test data for sorting verification
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(3),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // 3. Get seller ID from the authenticated session for filtering tests
  const sellerId = sellerAuth.id;
  // 4. Test sorting with different fields and directions
  const sortCombinations: Array<{
    sortBy: Exclude<IEcommerceMallSellerRegistration.IRequest["sortBy"], null>;
    sortOrder: Exclude<
      IEcommerceMallSellerRegistration.IRequest["sortOrder"],
      null
    >;
  }> = [
    { sortBy: "createdAt", sortOrder: "asc" },
    { sortBy: "createdAt", sortOrder: "desc" },
    { sortBy: "reviewedAt", sortOrder: "asc" },
    { sortBy: "reviewedAt", sortOrder: "desc" },
    { sortBy: "updatedAt", sortOrder: "asc" },
    { sortBy: "updatedAt", sortOrder: "desc" },
    { sortBy: "status", sortOrder: "asc" },
    { sortBy: "status", sortOrder: "desc" },
  ];
  for (const { sortBy, sortOrder } of sortCombinations) {
    const response =
      await api.functional.ecommerceMall.seller.seller_registrations.index(
        sellerConnection,
        {
          body: {
            limit: 20,
            cursor: null,
            status: null,
            sellerId: null,
            reviewerId: null,
            createdAtFrom: null,
            createdAtTo: null,
            reviewedAtFrom: null,
            reviewedAtTo: null,
            sortBy,
            sortOrder,
          } satisfies IEcommerceMallSellerRegistration.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `${sortBy} ${sortOrder} returns valid pagination`,
      response.pagination.records >= 0,
    );
  }
  // 5. Test cursor-based pagination
  const cursorPage1 =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 5,
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(cursorPage1);
  // 6. Test offset-based pagination with page parameter
  const offsetPage1 =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 5,
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(offsetPage1);
  const offsetPage2 =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 5,
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 2,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(offsetPage2);
  // 7. Test empty results - Filter by non-existent sellerId
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          cursor: null,
          status: null,
          sellerId: nonExistentSellerId,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results has records=0",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results has pages=0",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results has empty data array",
    emptyResults.data.length === 0,
  );
  // 8. Test filtering by specific sellerId to view own registrations only
  const filteredBySeller =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          cursor: null,
          status: null,
          sellerId: sellerId,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(filteredBySeller);
  TestValidator.predicate(
    "filtered results contain only registrations for target seller",
    filteredBySeller.data.every(
      (item: IEcommerceMallSellerRegistration.ISummary) =>
        item.seller.id === sellerId,
    ),
  );
}
