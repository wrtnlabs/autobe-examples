import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate seller retrieval of their own order's fulfillment detail.
 *
 * Steps:
 *
 * 1. Register a seller via /auth/seller/join. Capture authorized seller info.
 * 2. Prepare mock orderCode and fulfillmentCode using typia.random<string>(),
 *    since product listing and order APIs are not provided in current DTO/API
 *    set.
 * 3. Invoke api.functional.shopping.seller.orders.fulfillments.at (GET
 *    /shopping/seller/orders/{orderCode}/fulfillments/{fulfillmentCode}) as the
 *    seller.
 * 4. Assert that fulfillment details are returned, typia-typed, and that the
 *    seller ID matches, the status and logistics fields exist as expected.
 */
export async function test_api_order_fulfillment_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(seller);
  TestValidator.equals(
    "seller email as registered",
    seller.email,
    sellerBody.email,
  );

  // 2. Prepare mock codes as we lack order/fulfillment creation APIs
  const orderCode = typia.random<string>();
  const fulfillmentCode = typia.random<string>();

  // 3. Seller retrieves fulfillment detail for their order
  const fulfillment: IShoppingOrderFulfillment =
    await api.functional.shopping.seller.orders.fulfillments.at(connection, {
      orderCode,
      fulfillmentCode,
    });
  typia.assert(fulfillment);

  // 4. Basic field validation: returned fulfillment has correct types, correct seller linkage
  TestValidator.equals(
    "returned shopping_seller_id matches seller",
    fulfillment.shopping_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "fulfillment_code exists",
    typeof fulfillment.fulfillment_code === "string" &&
      fulfillment.fulfillment_code.length > 0,
  );
  TestValidator.predicate(
    "quantity_fulfilled is positive",
    fulfillment.quantity_fulfilled >= 1,
  );
  TestValidator.predicate(
    "fulfilled_at valid ISO",
    typeof fulfillment.fulfilled_at === "string" &&
      fulfillment.fulfilled_at.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof fulfillment.status === "string" && fulfillment.status.length > 0,
  );
  TestValidator.predicate(
    "created_at valid ISO",
    typeof fulfillment.created_at === "string" &&
      fulfillment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid ISO",
    typeof fulfillment.updated_at === "string" &&
      fulfillment.updated_at.length > 0,
  );
}
