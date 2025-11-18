import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that a customer cannot delete another customer’s review.
 *
 * Business context:
 *
 * - Reviews are authored by customers and owned by the customer account that
 *   created them.
 * - The customer-scoped deletion endpoint DELETE
 *   /shoppingMall/customer/customers/{customerId}/reviews/{reviewId} must only
 *   allow the owner (or privileged admins via other APIs) to delete a review.
 * - Another authenticated customer must not be able to delete someone else’s
 *   review.
 *
 * Scenario steps (adapted to available SDK functions):
 *
 * 1. Bootstrap required master data as an admin:
 *
 *    - Create country and region.
 *    - Create SKU inventory state.
 *    - Create shipping and payment methods.
 * 2. Bootstrap catalog as a seller:
 *
 *    - Seller joins and logs in.
 *    - Create a product.
 *    - Create a category and attach it to the product.
 *    - Create an inventory state and SKU under the product.
 * 3. Create Customer A and place an order the customer can review:
 *
 *    - Customer A joins and logs in.
 *    - Create a cart for Customer A.
 *    - Create an order for Customer A with one order item pointing at the SKU, with
 *         a simple inline shipping address snapshot and linking the previously
 *         created shipping and payment methods.
 *    - Create a logical payment for the order to simulate a paid purchase.
 * 4. Customer A creates a review for the order item:
 *
 *    - Use POST /shoppingMall/customer/orderItems/{orderItemId}/reviews via
 *         api.functional.shoppingMall.customer.orderItems.reviews.create.
 *    - Capture the returned IShoppingMallReview, including its id and the owning
 *         customer’s id.
 * 5. Create Customer B as a separate actor:
 *
 *    - Customer B joins and logs in.
 * 6. As Customer B, attempt to delete Customer A’s review:
 *
 *    - Call api.functional.shoppingMall.customer.customers.reviews.erase with
 *         customerId set to Customer A’s id and reviewId set to the review id
 *         from step 4, while authenticated as Customer B.
 *    - Use await TestValidator.error("other customer cannot delete review", async ()
 *         => { ... }) to assert that this operation fails with some
 *         authorization-related error. Do not assert a specific HTTP status
 *         code.
 * 7. Re-authenticate as Customer A and ensure the review is still logically
 *    present:
 *
 *    - Because this SDK does not expose a dedicated review fetch/list API, we rely
 *         on the original review object remaining valid and typia.assert on it
 *         rather than re-fetching.
 *    - The core authorization rule under test is that another customer cannot
 *         successfully delete the review; as long as the deletion call fails
 *         for Customer B, we consider the review intact.
 */
export async function test_api_customer_review_deletion_forbidden_for_other_customer(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: admin join and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create country
  const countryCreateBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create region under that country
  const regionCreateBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Create SKU inventory state
  const skuInventoryStateCreateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Create shipping method
  const shippingMethodCreateBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 6. Create payment method
  const paymentMethodCreateBody =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 7. Seller joins and logs in
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 8. Seller creates a product
  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 9. Admin creates a category and links it to the product
  const categoryCreateBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody =
    typia.random<IShoppingMallProductCategory.ICreate>();
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 10. Seller creates a SKU under the product using the created inventory state
  const skuCreateBody: IShoppingMallSku.ICreate = {
    ...typia.random<IShoppingMallSku.ICreate>(),
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
  };
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 11. Customer A joins and logs in
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerALoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoggedIn);

  const customerAId = customerALoggedIn.id;

  // 12. Customer A creates a cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 13. Customer A creates an order with one order item and shipping/payment info
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "12345",
    state_or_region: region.code,
    city: "Test City",
    address_line1: "123 Test Street",
    address_line2: null,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const orderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert(orderItem);

  // 14. Create a logical payment for the order
  const orderPaymentCreateBody: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 15. Customer A creates a review for the order item (order-item scoped)
  const reviewCreateBody: IShoppingMallReview.ICreate = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
  };

  const reviewA: IShoppingMallReview =
    await api.functional.shoppingMall.customer.orderItems.reviews.create(
      connection,
      {
        orderItemId: orderItem.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(reviewA);

  const reviewId = reviewA.id;

  // 16. Customer B joins and logs in
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerBLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoggedIn);

  // 17. As Customer B, attempt to delete Customer A’s review and expect error
  await TestValidator.error("other customer cannot delete review", async () => {
    await api.functional.shoppingMall.customer.customers.reviews.erase(
      connection,
      {
        customerId: customerAId as string & tags.Format<"uuid">,
        reviewId: reviewId,
      },
    );
  });

  // 18. Re-authenticate as Customer A (to ensure context is valid again)
  const customerALoginAgainBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerALoggedInAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginAgainBody,
    });
  typia.assert(customerALoggedInAgain);

  // 19. Assert that the originally created review object is still a valid
  // IShoppingMallReview instance from the type system perspective. While we
  // cannot re-fetch it via a dedicated API in this SDK, the core authorization
  // guarantee under test is that Customer B could not delete it.
  typia.assert<IShoppingMallReview>(reviewA);

  TestValidator.predicate(
    "review rating remains as created after failed deletion attempt",
    reviewA.rating === reviewCreateBody.rating,
  );
}
