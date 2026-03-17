import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { generate_random_shopping_mall_seller_refund_requests_responses_create } from "../../../generate/generate_random_shopping_mall_seller_refund_requests_responses_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_refund_request_response_approval_for_own_item(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinedSeller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const targetVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.name(2),
          price: 120,
        },
      },
    );
  typia.assert(targetVariant);
  const otherVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.name(2),
          price: 140,
        },
      },
    );
  typia.assert(otherVariant);
  const targetInventoryRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: targetVariant.id,
        },
        body: {
          quantity_change: 100,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          occurred_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(targetInventoryRecord);
  const otherInventoryRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: otherVariant.id,
        },
        body: {
          quantity_change: 100,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          occurred_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(otherInventoryRecord);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const shippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
          is_default: true,
        },
      },
    );
  typia.assert(shippingAddress);
  const targetCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: targetVariant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(targetCartItem);
  const otherCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: otherVariant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(otherCartItem);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: targetCartItem.subtotal + otherCartItem.subtotal,
          gateway_provider: "test-gateway",
        },
      },
    );
  typia.assert(paymentAttempt);
  const finalizedPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: RandomGenerator.alphaNumeric(16),
          failure_reason: null,
          processed_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(finalizedPaymentAttempt);
  TestValidator.equals(
    "payment attempt finalized to succeeded",
    finalizedPaymentAttempt.status,
    "succeeded",
  );
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(loggedInSeller);
  const reviewNote = RandomGenerator.paragraph({ sentences: 5 });
  const responded =
    await generate_random_shopping_mall_seller_refund_requests_responses_create(
      sellerLoginConnection,
      {
        params: {
          refundRequestId: refundRequest.id,
        },
        body: {
          status: "approved",
          review_note: reviewNote,
        },
      },
    );
  typia.assert(responded);
  TestValidator.equals(
    "refund request id unchanged",
    responded.id,
    refundRequest.id,
  );
  TestValidator.notEquals(
    "refund request status changed after response",
    responded.status,
    refundRequest.status,
  );
  TestValidator.equals("refund request approved", responded.status, "approved");
  TestValidator.equals(
    "reviewer role is seller",
    responded.reviewer_role,
    "seller",
  );
  TestValidator.equals(
    "review note recorded",
    responded.review_note,
    reviewNote,
  );
  TestValidator.predicate(
    "reviewed timestamp populated",
    responded.reviewed_at !== null,
  );
  TestValidator.equals(
    "refund request order item unchanged",
    responded.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.equals(
    "refund request customer unchanged",
    responded.customer.id,
    refundRequest.customer.id,
  );
  TestValidator.equals(
    "response item seller matches authenticated seller",
    responded.orderItem.seller.id,
    loggedInSeller.id,
  );
}
