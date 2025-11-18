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

export async function test_api_customer_review_delete_enforces_ownership(
  connection: api.IConnection,
) {
  // 0. Helper to clone connection without carrying over seller/admin/customer auth when needed
  const baseConnection: api.IConnection = { ...connection };

  // 1. Bootstrap admin (join + login) to perform all admin-scoped creations
  const adminEmail: string = RandomGenerator.alphaNumeric(12) + "@admin.test";
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(baseConnection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminLoginBody = {
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.login.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(baseConnection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const adminConn: api.IConnection = { ...baseConnection };

  // 2. Bootstrap seller (join + login)
  const sellerEmail: string = RandomGenerator.alphaNumeric(12) + "@seller.test";
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);

  const sellerJoinBody = {
    email: sellerEmail as string & tags.Format<"email">,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(baseConnection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerLoginBody = {
    email: sellerEmail as string & tags.Format<"email">,
    password: sellerPassword,
    ip: null,
    href: "https://seller.login.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/seller-login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(baseConnection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerConn: api.IConnection = { ...baseConnection };

  // 3. Bootstrap customers A and B (join only; we’ll login explicitly for flows)
  const customerAEmail: string =
    RandomGenerator.alphaNumeric(12) + "@custA.test";
  const customerAPassword: string = RandomGenerator.alphaNumeric(16);

  const customerAJoinBody = {
    email: customerAEmail as string & tags.Format<"email">,
    password: customerAPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customerA.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(baseConnection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAJoined);

  const customerBEmail: string =
    RandomGenerator.alphaNumeric(12) + "@custB.test";
  const customerBPassword: string = RandomGenerator.alphaNumeric(16);

  const customerBJoinBody = {
    email: customerBEmail as string & tags.Format<"email">,
    password: customerBPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customerB.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerBJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(baseConnection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBJoined);

  // customer connections will follow login calls, using baseConnection as source
  const customerConn: api.IConnection = { ...baseConnection };

  // Helper: login as Customer A
  const loginCustomerA =
    async (): Promise<IShoppingMallCustomer.IAuthorized> => {
      const body = {
        email: customerAEmail as string & tags.Format<"email">,
        password: customerAPassword,
        ip: null,
        href: "https://customerA.login.example.com/" as string &
          tags.Format<"uri">,
        referrer: "https://landing.example.com/customerA-login" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallCustomerLogin.IRequest;
      const out: IShoppingMallCustomer.IAuthorized =
        await api.functional.auth.customer.login(customerConn, { body });
      typia.assert(out);
      return out;
    };

  // Helper: login as Customer B
  const loginCustomerB =
    async (): Promise<IShoppingMallCustomer.IAuthorized> => {
      const body = {
        email: customerBEmail as string & tags.Format<"email">,
        password: customerBPassword,
        ip: null,
        href: "https://customerB.login.example.com/" as string &
          tags.Format<"uri">,
        referrer: "https://landing.example.com/customerB-login" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallCustomerLogin.IRequest;
      const out: IShoppingMallCustomer.IAuthorized =
        await api.functional.auth.customer.login(customerConn, { body });
      typia.assert(out);
      return out;
    };

  // 4. Admin: create country
  const countryCode: string = RandomGenerator.alphaNumeric(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Test Country " + RandomGenerator.alphabets(5),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(adminConn, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. Admin: create region under the country
  const regionCreateBody = {
    code: "R1",
    name_en: "Region One",
    region_type: "test-region",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      adminConn,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 6. Admin: create category
  const categoryCreateBody = {
    parent_id: null,
    slug: "cat-" + RandomGenerator.alphaNumeric(8),
    name_en: "Category " + RandomGenerator.alphabets(5),
    description_en: "Test category for review ownership scenario",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 7. Admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: "SHIP-" + RandomGenerator.alphaNumeric(6),
    display_name: "Standard Shipping",
    service_level_description: "Standard test shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(adminConn, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 8. Admin: create payment method
  const paymentMethodCreateBody = {
    code: "PAY-" + RandomGenerator.alphaNumeric(6),
    display_name: "Test Payment",
    description: "Test payment method",
    provider_type: "test-provider",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(adminConn, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 9. Admin: create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(4),
    name: "In Stock",
    description: "Purchasable inventory state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      adminConn,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 10. Seller: create product
  const productCreateBody = {
    code: "P-" + RandomGenerator.alphaNumeric(6),
    title: "Ownership Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://example.com/img.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConn, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 11. Admin: link product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      adminConn,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 12. Seller: create SKU for product
  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(sellerConn, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 13. Customer A: login and create shipping address
  const customerALoggedIn = await loginCustomerA();
  const customerAId: string & tags.Format<"uuid"> = customerALoggedIn.id;

  const customerAAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer A Recipient",
    line1: "123 Test Street",
    line2: "Apt 1",
    city: "TestCity",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      customerConn,
      {
        customerId: customerAId,
        body: customerAAddressCreateBody,
      },
    );
  typia.assert(customerAAddress);

  // 14. Customer A: create cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(customerConn, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 15. Customer A: create order with one item using SKU and address snapshot
  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAAddress.recipient_name,
      phone_number: customerAAddress.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAAddress.postal_code,
      state_or_region: region.code,
      city: customerAAddress.city,
      address_line1: customerAAddress.line1,
      address_line2: customerAAddress.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: null,
    currency_code: "USD",
    items: [orderItemCreateBody],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(customerConn, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 16. Customer A: create first review (used to verify positive delete case)
  const reviewCreateBody1 = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product for ownership test",
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallReview.ICreate;

  const review1: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(customerConn, {
      body: reviewCreateBody1,
    });
  typia.assert(review1);

  const reviewId1: string & tags.Format<"uuid"> = review1.id;

  // 17. Positive control: Customer A can delete own review
  await api.functional.shoppingMall.customer.reviews.erase(customerConn, {
    reviewId: reviewId1,
  });

  // 18. Customer A: create second review which will be targeted by Customer B
  const reviewCreateBody2 = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Second review for ownership enforcement",
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallReview.ICreate;

  const review2: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(customerConn, {
      body: reviewCreateBody2,
    });
  typia.assert(review2);

  const reviewId2: string & tags.Format<"uuid"> = review2.id;

  // 19. Switch to Customer B and attempt to delete Customer A's review
  await loginCustomerB();

  await TestValidator.error(
    "non-owner customer cannot delete another customer's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(customerConn, {
        reviewId: reviewId2,
      });
    },
  );

  // 20. Switch back to Customer A and verify the review is still deletable
  await loginCustomerA();

  await api.functional.shoppingMall.customer.reviews.erase(customerConn, {
    reviewId: reviewId2,
  });

  // Ownership enforcement assertions are validated by control flow:
  // - Owner (A) successfully deleted their review twice (first and second review)
  // - Non-owner (B) could not delete A's review (TestValidator.error assertion)
  // - A's ability to delete after B's failure implies the review remained present and owned by A.
}
