import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_order_detail_historical_snapshot_preserved(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerApproval =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(sellerApproval);
  const sellerProfileAtPurchase =
    await api.functional.shoppingMall.seller.profile.update(sellerConnection, {
      body: {
        displayName: `${RandomGenerator.name()} Store`,
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(sellerProfileAtPurchase);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `${RandomGenerator.name()} Product`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 15000,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: "Default",
          price: 17000,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  const originalAddressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: `${RandomGenerator.alphabets(8)} street 101`,
    city: "Seoul",
    state_province: "Seoul",
    postal_code: "04524",
    country: "KR",
    is_default: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const originalAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: originalAddressInput,
      },
    );
  typia.assert(originalAddress);
  const attemptedAmount = variant.price ?? product.base_price;
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: attemptedAmount,
          gateway_provider: "test-gateway",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  const succeededPayment =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: `paid-${RandomGenerator.alphaNumeric(12)}`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(succeededPayment);
  const updatedAddressInput = {
    recipient_name: `${originalAddress.recipient_name} Updated`,
    phone_number: RandomGenerator.mobile(),
    street_address: `${RandomGenerator.alphabets(10)} avenue 202`,
    city: "Busan",
    state_province: "Busan",
    postal_code: "48058",
    country: "KR",
    is_default: true,
  } satisfies IShoppingMallShippingAddress.IUpdate;
  const updatedAddress =
    await api.functional.shoppingMall.customer.shippingAddresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: updatedAddressInput,
      },
    );
  typia.assert(updatedAddress);
  const sellerProfileAfterEdit =
    await api.functional.shoppingMall.seller.profile.update(sellerConnection, {
      body: {
        displayName: `${sellerProfileAtPurchase.displayName} Updated`,
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(sellerProfileAfterEdit);
  const orderHistory = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderHistory);
  TestValidator.predicate(
    "order history contains at least one order",
    orderHistory.data.length > 0,
  );
  const orderSummary = orderHistory.data[0];
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: orderSummary.id,
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "detail order id matches summary",
    order.id,
    orderSummary.id,
  );
  TestValidator.equals(
    "detail order code matches summary",
    order.code,
    orderSummary.code,
  );
  TestValidator.predicate("order has purchased items", order.items.length > 0);
  TestValidator.equals(
    "order total remains understandable",
    order.total_price,
    orderSummary.total_price,
  );
  TestValidator.equals(
    "payment status succeeded",
    order.paymentAttempt?.status ?? null,
    "succeeded",
  );
  const purchasedItem = order.items[0];
  TestValidator.equals(
    "snapshot product name preserved",
    purchasedItem.productPurchaseSnapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description preserved",
    purchasedItem.productPurchaseSnapshot.product_description,
    product.description,
  );
  TestValidator.equals(
    "snapshot sku preserved",
    purchasedItem.productPurchaseSnapshot.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "snapshot unit price preserved",
    purchasedItem.productPurchaseSnapshot.unit_price,
    purchasedItem.unit_price,
  );
  TestValidator.equals(
    "seller snapshot order item linkage preserved",
    purchasedItem.sellerProfilePurchaseSnapshot.orderItem.id,
    purchasedItem.id,
  );
  TestValidator.equals(
    "product snapshot order item linkage preserved",
    purchasedItem.productPurchaseSnapshot.orderItem.id,
    purchasedItem.id,
  );
  TestValidator.equals(
    "seller purchase snapshot preserves purchase-time name",
    purchasedItem.sellerProfilePurchaseSnapshot.shop_name,
    sellerProfileAtPurchase.displayName,
  );
  TestValidator.notEquals(
    "seller purchase snapshot not overwritten by later profile edit",
    purchasedItem.sellerProfilePurchaseSnapshot.shop_name,
    sellerProfileAfterEdit.displayName,
  );
  TestValidator.equals(
    "address snapshot bound to same order",
    order.addressSnapshot.order.id,
    order.id,
  );
  TestValidator.notEquals(
    "updated recipient actually changed",
    updatedAddress.recipient_name,
    originalAddress.recipient_name,
  );
  TestValidator.notEquals(
    "updated phone actually changed",
    updatedAddress.phone_number,
    originalAddress.phone_number,
  );
  TestValidator.notEquals(
    "updated street actually changed",
    updatedAddress.street_address,
    originalAddress.street_address,
  );
  TestValidator.notEquals(
    "updated city actually changed",
    updatedAddress.city,
    originalAddress.city,
  );
  TestValidator.notEquals(
    "updated state actually changed",
    updatedAddress.state_province,
    originalAddress.state_province,
  );
  TestValidator.notEquals(
    "updated postal code actually changed",
    updatedAddress.postal_code,
    originalAddress.postal_code,
  );
  TestValidator.notEquals(
    "address snapshot recipient differs from later edited address-book value",
    order.addressSnapshot.recipient_name,
    updatedAddress.recipient_name,
  );
  TestValidator.notEquals(
    "address snapshot phone differs from later edited address-book value",
    order.addressSnapshot.phone_number,
    updatedAddress.phone_number,
  );
  TestValidator.notEquals(
    "address snapshot street differs from later edited address-book value",
    order.addressSnapshot.street_address,
    updatedAddress.street_address,
  );
  TestValidator.notEquals(
    "address snapshot city differs from later edited address-book value",
    order.addressSnapshot.city,
    updatedAddress.city,
  );
  TestValidator.notEquals(
    "address snapshot state differs from later edited address-book value",
    order.addressSnapshot.state_province,
    updatedAddress.state_province,
  );
  TestValidator.notEquals(
    "address snapshot postal code differs from later edited address-book value",
    order.addressSnapshot.postal_code,
    updatedAddress.postal_code,
  );
  TestValidator.equals(
    "address snapshot country remains coherent",
    order.addressSnapshot.country,
    originalAddress.country,
  );
}
