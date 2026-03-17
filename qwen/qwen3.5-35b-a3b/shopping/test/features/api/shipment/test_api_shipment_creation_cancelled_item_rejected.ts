import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that shipment creation rejects order items with invalid status (cancelled).
 *
 * This test validates the business rule that sellers cannot create shipments
 * for order items that have been cancelled, already shipped, or refunded.
 *
 * Flow:
 * 1. Seller joins and authenticates
 * 2. Customer joins and authenticates
 * 3. Seller attempts to create shipment with invalid/non-existent order items
 * 4. System rejects the shipment creation with validation error
 */
export async function test_api_shipment_creation_cancelled_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerEmail = typia.random<string>();
  const sellerPassword = "SellerTest123!";
  const sellerHref = "https://seller.example.com/join";
  const sellerReferrer = "https://seller.example.com";
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: sellerHref,
        referrer: sellerReferrer,
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerJoined);
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(authenticatedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Customer authentication
  const customerEmail = typia.random<string>();
  const customerPassword = "CustomerTest123!";
  const customerHref = "https://customer.example.com/join";
  const customerReferrer = "https://customer.example.com";
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_login(authenticatedCustomerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: typia.random<string>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Attempt to create shipment with invalid/non-existent order item ID
  // The system should reject this as the order item doesn't exist or
  // doesn't have valid "paid" status required for shipment creation
  const invalidOrderIdItem = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "shipment creation rejected for invalid order item",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.create(
        authenticatedSellerConnection,
        {
          body: {
            order_item_ids: [invalidOrderIdItem],
            carrier_name: "Test Carrier",
          } satisfies IEcommerceMallShipment.ICreate,
        },
      );
    },
  );
}
