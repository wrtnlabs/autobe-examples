import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate free-text search over customer address snapshot fields.
 *
 * Business goal
 *
 * - Ensure that PATCH
 *   /shoppingMall/customer/customers/{customerId}/addressSnapshots correctly
 *   applies `searchText` over human-readable address fields within address
 *   snapshots, so that customer service and compliance users can quickly locate
 *   historical addresses by partial text (city or street).
 *
 * High-level flow
 *
 * 1. Admin bootstrap
 *
 *    - Join as an admin and rely on SDK to establish an admin Authorization context.
 *    - Create an active country master and a region under that country.
 * 2. Customer bootstrap
 *
 *    - Join as a customer and rely on SDK to establish a customer Authorization
 *         context.
 * 3. Address creation
 *
 *    - For that customer, create two distinct addresses referencing the created
 *         country (and optionally region):
 *
 *         - Address A in city "London" (e.g., line1 "221B Baker Street").
 *         - Address B in city "New York" (e.g., line1 "742 Evergreen Terrace").
 * 4. Snapshot search
 *
 *    - Call addressSnapshots.index with searchText "London" and validate that every
 *         returned snapshot’s textual components contain the term.
 *    - Call addressSnapshots.index with searchText "New York" and likewise validate
 *         term presence.
 * 5. Cross-term distinction
 *
 *    - When both result sets are non-empty, confirm they are logically distinct
 *         (e.g., snapshot IDs do not overlap or cities differ).
 *
 * Notes
 *
 * - Snapshot creation itself is not directly triggered in this test because no
 *   explicit snapshot-generating API is exposed in the provided SDK. The focus
 *   is strictly on validating the contract and behavior of the search endpoint
 *   given the request/response DTOs.
 */
export async function test_api_customer_address_snapshots_search_text_over_address_fields(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join as an admin so we can create country/region.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an active country.
  const countryBody = {
    country_code: `TST-${RandomGenerator.alphabets(3).toUpperCase()}`,
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Create a region under that country.
  const regionCode = `REG-${RandomGenerator.alphabets(3).toUpperCase()}`;
  const regionBody = {
    code: regionCode,
    name_en: "Test Region",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 4. Customer bootstrap: join as a customer to get authorized context.
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com` as string &
      tags.Format<"email">,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 5. Create addresses for the customer.
  // Address A: London
  const addressALondonBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Sherlock Holmes",
    line1: "221B Baker Street",
    line2: "",
    city: "London",
    postal_code: "NW1 6XE",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressALondonBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressA);

  // Address B: New York
  const addressBNewYorkBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Homer Simpson",
    line1: "742 Evergreen Terrace",
    line2: "",
    city: "New York",
    postal_code: "10001",
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBNewYorkBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressB);

  // 6. Perform snapshot searches using searchText over address fields.
  const londonSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: null,
    regionId: null,
    searchText: "London",
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;

  const londonPage: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: londonSearchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerAddressSnapshot.ISummary>(londonPage);

  const newYorkSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: null,
    regionId: null,
    searchText: "New York",
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;

  const newYorkPage: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: newYorkSearchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerAddressSnapshot.ISummary>(newYorkPage);

  // 7. Validate that every snapshot in each result set matches the search term
  //    in at least one of the textual address fields.
  const londonTermLower = "London".toLowerCase();
  for (const snap of londonPage.data) {
    const textBucket = [
      snap.recipient_name,
      snap.line1,
      snap.line2 ?? "",
      snap.city,
      snap.postal_code,
    ]
      .join(" ")
      .toLowerCase();

    TestValidator.predicate(
      "each London search result should contain 'London' in its address fields",
      textBucket.includes(londonTermLower),
    );
  }

  const newYorkTermLower = "New York".toLowerCase();
  for (const snap of newYorkPage.data) {
    const textBucket = [
      snap.recipient_name,
      snap.line1,
      snap.line2 ?? "",
      snap.city,
      snap.postal_code,
    ]
      .join(" ")
      .toLowerCase();

    TestValidator.predicate(
      "each New York search result should contain 'New York' in its address fields",
      textBucket.includes(newYorkTermLower),
    );
  }

  // 8. Cross-result distinction when both sets are non-empty.
  if (londonPage.data.length > 0 && newYorkPage.data.length > 0) {
    const londonIds = new Set(londonPage.data.map((s) => s.id));
    const overlapping = newYorkPage.data.some((s) => londonIds.has(s.id));

    TestValidator.predicate(
      "London and New York search result sets should not share snapshot IDs",
      !overlapping,
    );
  }

  // 9. Baseline search with no searchText should not be stricter than
  //    searchText-filtered queries, insofar as we can approximate via lengths.
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: null,
    regionId: null,
    searchText: null,
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;

  const baselinePage: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: baselineRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerAddressSnapshot.ISummary>(
    baselinePage,
  );

  TestValidator.predicate(
    "baseline (no searchText) result count should be >= London search result count",
    baselinePage.data.length >= londonPage.data.length,
  );
  TestValidator.predicate(
    "baseline (no searchText) result count should be >= New York search result count",
    baselinePage.data.length >= newYorkPage.data.length,
  );
}
