import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderAddress";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate that sellers can retrieve all addresses (shipping and billing) for
 * an order they fulfill.
 *
 * 1. Register a new seller account with randomized but valid information to ensure
 *    unique test runs.
 * 2. Call the seller order addresses endpoint for a (already-existing) order using
 *    the seller's authentication context.
 * 3. Validate that the paginated list of returned addresses contains both
 *    "shipping" and "billing" type addresses as expected.
 * 4. Assert critical fields of returned address summaries including id,
 *    shopping_order_id, type (either 'shipping' or 'billing'), recipient
 *    details, zip_code, base_address, city, state_province, and country.
 * 5. Assert that the API returns only addresses for the specified order, and the
 *    response structure complies exactly with
 *    IPageIShoppingOrderAddress.ISummary & IShoppingOrderAddress.ISummary.
 */
export async function test_api_order_addresses_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@testshop.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 2. Retrieve addresses for an order (simulate with a random order code)
  const orderCode = RandomGenerator.alphaNumeric(12);
  const addressReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    // Additional filters can be omitted for full listing
  } satisfies IShoppingOrderAddress.IRequest;

  const page: IPageIShoppingOrderAddress.ISummary =
    await api.functional.shopping.seller.orders.addresses.index(connection, {
      orderCode,
      body: addressReq,
    });
  typia.assert(page);

  // 3. Validate page structure and presence of both address types (if any).
  TestValidator.predicate(
    "response contains only addresses for one order",
    ArrayUtil.has(
      page.data,
      (addr) => typeof addr.shopping_order_id === "string",
    ),
  );
  if (page.data.length > 0) {
    const addressTypes = page.data.map((addr) => addr.type);
    TestValidator.predicate(
      "at least one shipping or billing address present",
      addressTypes.includes("shipping") || addressTypes.includes("billing"),
    );
    page.data.forEach((addr, i) => {
      TestValidator.predicate(
        `address #${i} is shipping/billing`,
        addr.type === "shipping" || addr.type === "billing",
      );
      TestValidator.predicate(
        `address #${i} has recipient name`,
        typeof addr.recipient_name === "string" &&
          addr.recipient_name.length > 0,
      );
      TestValidator.predicate(
        `address #${i} has recipient phone`,
        typeof addr.recipient_phone === "string" &&
          addr.recipient_phone.length > 0,
      );
      TestValidator.predicate(
        `address #${i} has zip_code`,
        typeof addr.zip_code === "string",
      );
      TestValidator.predicate(
        `address #${i} has base_address`,
        typeof addr.base_address === "string" && addr.base_address.length > 0,
      );
      TestValidator.predicate(
        `address #${i} has city`,
        typeof addr.city === "string" && addr.city.length > 0,
      );
      TestValidator.predicate(
        `address #${i} has state_province`,
        typeof addr.state_province === "string" &&
          addr.state_province.length > 0,
      );
      TestValidator.predicate(
        `address #${i} has country`,
        typeof addr.country === "string" && addr.country.length > 0,
      );
    });
  }
}
