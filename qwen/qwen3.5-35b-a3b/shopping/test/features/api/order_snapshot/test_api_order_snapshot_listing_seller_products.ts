import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_snapshot_listing_seller_products(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  // Create seller-specific connection for authenticated requests
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Test order snapshot listing with default pagination
  const defaultRequest: IEcommerceMallOrderSnapshot.IRequest = {};
  const defaultResponse =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      typeof defaultResponse.pagination.current === "number" &&
      typeof defaultResponse.pagination.limit === "number" &&
      typeof defaultResponse.pagination.records === "number" &&
      typeof defaultResponse.pagination.pages === "number",
  );
  // Step 3: Test with explicit pagination parameters
  const paginatedRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: paginatedRequest },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata matches request
  TestValidator.equals(
    "page number matches",
    paginatedResponse.pagination.current,
    paginatedRequest.page,
  );
  TestValidator.equals(
    "limit matches",
    paginatedResponse.pagination.limit,
    paginatedRequest.limit,
  );
  // Step 4: Validate snapshot summary structure when data exists
  if (paginatedResponse.data.length > 0) {
    const firstSnapshot = paginatedResponse.data[0];
    // Validate all required snapshot fields exist
    TestValidator.predicate(
      "snapshot has id",
      () => typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has order_number",
      () => typeof firstSnapshot.order_number === "string",
    );
    TestValidator.predicate(
      "snapshot has order_date",
      () => typeof firstSnapshot.order_date === "string",
    );
    TestValidator.predicate(
      "snapshot has customer_name",
      () => typeof firstSnapshot.customer_name === "string",
    );
    TestValidator.predicate(
      "snapshot has customer_phone",
      () => typeof firstSnapshot.customer_phone === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_recipient_name",
      () => typeof firstSnapshot.shipping_recipient_name === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_phone",
      () => typeof firstSnapshot.shipping_phone === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_street",
      () => typeof firstSnapshot.shipping_street === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_city",
      () => typeof firstSnapshot.shipping_city === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_state",
      () => typeof firstSnapshot.shipping_state === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_postal_code",
      () => typeof firstSnapshot.shipping_postal_code === "string",
    );
    TestValidator.predicate(
      "snapshot has shipping_country",
      () => typeof firstSnapshot.shipping_country === "string",
    );
    TestValidator.predicate(
      "snapshot has item_count",
      () => typeof firstSnapshot.item_count === "number",
    );
    TestValidator.predicate(
      "snapshot has subtotal",
      () => typeof firstSnapshot.subtotal === "number",
    );
    TestValidator.predicate(
      "snapshot has shipping_fee",
      () => typeof firstSnapshot.shipping_fee === "number",
    );
    TestValidator.predicate(
      "snapshot has total_amount",
      () => typeof firstSnapshot.total_amount === "number",
    );
    TestValidator.predicate(
      "snapshot has order_status",
      () => typeof firstSnapshot.order_status === "string",
    );
    // Validate date-time format for order_date
    TestValidator.predicate(
      "order_date is valid date-time",
      () => !isNaN(Date.parse(firstSnapshot.order_date)),
    );
  }
  // Step 5: Test different pagination boundaries
  // Test first page
  const page1Request: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1Response =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: page1Request },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  // Test second page
  const page2Request: IEcommerceMallOrderSnapshot.IRequest = {
    page: 2,
    limit: 10,
  };
  const page2Response =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: page2Request },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  // Step 6: Test with search filter
  const searchRequest: IEcommerceMallOrderSnapshot.IRequest = {
    search: "ORDER",
    limit: 20,
  };
  const searchResponse =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: searchRequest },
    );
  typia.assert(searchResponse);
  // Step 7: Test with sort parameters
  const sortRequest: IEcommerceMallOrderSnapshot.IRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    limit: 20,
  };
  const sortResponse =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: sortRequest },
    );
  typia.assert(sortResponse);
  // Step 8: Test with date range filters
  const dateRangeRequest: IEcommerceMallOrderSnapshot.IRequest = {
    order_date_start: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    order_date_end: new Date().toISOString(),
    limit: 20,
  };
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // Step 9: Validate pagination math
  if (paginatedResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      paginatedResponse.pagination.records / paginatedResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      paginatedResponse.pagination.pages,
      expectedPages,
    );
  }
}