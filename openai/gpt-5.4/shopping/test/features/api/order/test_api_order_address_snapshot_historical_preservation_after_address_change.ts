import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_order_address_snapshot_historical_preservation_after_address_change(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: `provider-${RandomGenerator.alphabets(6)}`,
        },
      },
    );
  typia.assert(paymentAttempt);
  const finalizedAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: RandomGenerator.alphaNumeric(12),
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalizedAttempt);
  const originalSavedAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Original Recipient",
          phone_number: "01012345678",
          street_address: "101 Original Street",
          city: "Seoul",
          state_province: "Seoul",
          postal_code: "04524",
          country: "KR",
          is_default: true,
        },
      },
    );
  typia.assert(originalSavedAddress);
  const updatedAddressBody = {
    recipient_name: "Updated Recipient",
    phone_number: "01087654321",
    street_address: "202 Updated Avenue",
    city: "Busan",
    state_province: "Busan",
    postal_code: "48241",
    country: "KR",
    is_default: true,
  } satisfies IShoppingMallShippingAddress.IUpdate;
  const updatedSavedAddress =
    await api.functional.shoppingMall.customer.shippingAddresses.update(
      customerConnection,
      {
        addressId: originalSavedAddress.id,
        body: updatedAddressBody,
      },
    );
  typia.assert(updatedSavedAddress);
  TestValidator.equals(
    "saved address recipient updated",
    updatedSavedAddress.recipient_name,
    updatedAddressBody.recipient_name,
  );
  TestValidator.equals(
    "saved address phone updated",
    updatedSavedAddress.phone_number,
    updatedAddressBody.phone_number,
  );
  TestValidator.equals(
    "saved address street updated",
    updatedSavedAddress.street_address,
    updatedAddressBody.street_address,
  );
  TestValidator.equals(
    "saved address city updated",
    updatedSavedAddress.city,
    updatedAddressBody.city,
  );
  TestValidator.equals(
    "saved address state updated",
    updatedSavedAddress.state_province,
    updatedAddressBody.state_province,
  );
  TestValidator.equals(
    "saved address postal code updated",
    updatedSavedAddress.postal_code,
    updatedAddressBody.postal_code,
  );
  TestValidator.equals(
    "saved address country updated",
    updatedSavedAddress.country,
    updatedAddressBody.country,
  );
  TestValidator.notEquals(
    "saved address recipient changed from original",
    updatedSavedAddress.recipient_name,
    originalSavedAddress.recipient_name,
  );
  TestValidator.notEquals(
    "saved address street changed from original",
    updatedSavedAddress.street_address,
    originalSavedAddress.street_address,
  );
}
