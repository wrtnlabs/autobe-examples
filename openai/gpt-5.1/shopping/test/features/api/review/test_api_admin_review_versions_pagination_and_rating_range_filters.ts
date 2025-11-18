import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import type { IShoppingMallReviewVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVersion";
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
 * Ensure that the admin reviewVersions search endpoint correctly applies
 * pagination and rating range filters across multiple reviews and versions.
 *
 * Business flow (heavily simplified vs. the narrative, constrained by available
 * APIs):
 *
 * 1. Admin joins and logs in (establish admin actor).
 * 2. Seller joins and logs in, then:
 *
 *    - Admin creates country, region, shipping method, payment method, SKU inventory
 *         state, and a category.
 *    - Seller creates a product and a SKU under that product.
 *    - Admin links the product to the category.
 * 3. Two customers join and log in. For each customer:
 *
 *    - Create a shipping address under the created country/region.
 *    - Create a cart and add the SKU as a cart item.
 *    - Create an order + embedded shipping snapshot + chosen shipping and payment
 *         methods.
 *    - Create a logical payment for the order.
 * 4. While logged in as each customer, create multiple reviews with various rating
 *    values (1, 3, 5). Each creation implicitly generates at least one review
 *    version snapshot.
 * 5. Switch back to admin and call PATCH /shoppingMall/admin/reviewVersions
 *    (index) with different IShoppingMallReviewVersion.IRequest payloads:
 *
 *    - High rating band (4–5), page 1, limit 10.
 *    - Low rating band (1–2), page 1 and page 2, limit 2, to observe pagination
 *         slices.
 *    - An out-of-range band (6–10) that should match no records.
 * 6. Validate that:
 *
 *    - All returned ratings lie within the requested min/max bounds.
 *    - Pagination metadata is consistent between page 1 and page 2 for the same
 *         filter.
 *    - When no records satisfy the filter, pagination.records === 0 and data is an
 *         empty array, with non-negative pages value.
 */
export async function test_api_admin_review_versions_pagination_and_rating_range_filters(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller join & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Admin: create country & region
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
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
  typia.assert(region);

  // 4. Admin: create shipping and payment methods
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 5. Admin: create SKU inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Sellable stock",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 6. Admin: create category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 7. Seller: create product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: "Test product summary",
    description: "Test product description",
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 8. Admin: link product to category
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 9. Seller: create SKU
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8) satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" satisfies string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // Helper to create a fully purchasable order for a customer and return order + first order item
  const createOrderWithItem = async (
    customer: IShoppingMallCustomer.IAuthorized,
  ): Promise<{
    order: IShoppingMallOrder;
    orderItem: IShoppingMallOrderItem;
  }> => {
    // Address
    const addressBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: RandomGenerator.name(2),
      line1: RandomGenerator.paragraph({ sentences: 2 }),
      line2: null,
      city: "Los Angeles",
      postal_code: "90001",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;

    const address: IShoppingMallCustomerAddress =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: addressBody,
        },
      );
    typia.assert(address);

    // Cart
    const cartBody = {
      actor_type: "customer",
      status: undefined,
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartBody,
      });
    typia.assert(cart);

    // Cart item
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    // Order shipping snapshot
    const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    };

    const orderBody = {
      cart_id: cart.id as string & tags.Format<"uuid">,
      currency_code: cart.currency_code,
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallOrderItem.ICreate,
      ],
      shipping_address_id: null,
      shipping_address_snapshot: shippingSnapshot,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);

    TestValidator.predicate(
      "order should contain at least one item",
      order.items.length > 0,
    );

    const firstItem = order.items[0];
    const orderItem = typia.assert<IShoppingMallOrderItem>(firstItem!);

    // Payment
    const paymentBody = {
      payment_method_id: paymentMethod.id,
      currency_code: order.currency_code,
      payable_amount: order.grand_total_amount,
      provider_reference: null,
      provider_status_code: null,
      metadata: null,
    } satisfies IShoppingMallOrderPayment.ICreate;

    const payment: IShoppingMallOrderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: paymentBody,
        },
      );
    typia.assert(payment);

    return { order, orderItem };
  };

  // Helper to create a customer and return both auth and password
  const makeCustomer = async (): Promise<{
    customer: IShoppingMallCustomer.IAuthorized;
    password: string & tags.Format<"password">;
  }> => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">;

    const joinBody = {
      email,
      password,
      ip: null,
      href: "https://shop.test.local/join" as string & tags.Format<"uri">,
      referrer: "https://shop.test.local" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest;

    const joined: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, { body: joinBody });
    typia.assert(joined);

    const loginBody = {
      email,
      password,
      ip: null,
      href: "https://shop.test.local/login" as string & tags.Format<"uri">,
      referrer: "https://shop.test.local" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;

    const authed: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, { body: loginBody });
    typia.assert(authed);

    return { customer: authed, password };
  };

  // 10. Create two customers, each with an order and then create reviews
  const { customer: customer1, password: customer1Password } =
    await makeCustomer();
  const { order: order1, orderItem: orderItem1 } =
    await createOrderWithItem(customer1);

  const { customer: customer2, password: customer2Password } =
    await makeCustomer();
  const { order: order2, orderItem: orderItem2 } =
    await createOrderWithItem(customer2);

  // Create several reviews with differing ratings; assume creating a review
  // creates an initial version snapshot in shopping_mall_review_versions.
  const ratings: (1 | 3 | 5)[] = [5, 3, 1, 5, 3, 1];
  const orderItems: IShoppingMallOrderItem[] = [
    orderItem1,
    orderItem2,
    orderItem1,
    orderItem2,
    orderItem1,
    orderItem2,
  ];
  const customers: IShoppingMallCustomer.IAuthorized[] = [
    customer1,
    customer2,
    customer1,
    customer2,
    customer1,
    customer2,
  ];
  const customerPasswords: (string & tags.Format<"password">)[] = [
    customer1Password,
    customer2Password,
    customer1Password,
    customer2Password,
    customer1Password,
    customer2Password,
  ];

  const createdReviews: IShoppingMallReview[] = [];

  for (let i = 0; i < ratings.length; i++) {
    const customer = customers[i];
    const password = customerPasswords[i];

    // Re-login as the appropriate customer for review creation
    const customerLoginBody = {
      email: customer.email,
      password,
      ip: null,
      href: "https://shop.test.local/login" as string & tags.Format<"uri">,
      referrer: "https://shop.test.local" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;

    const relogin: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert(relogin);

    const _orderItem = orderItems[i];
    // `_orderItem` is not used in request body, but its existence reflects
    // that the customer has a verified purchase context.
    typia.assert(_orderItem);

    const createBody = {
      rating: ratings[i],
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: createBody,
      });
    typia.assert(review);
    createdReviews.push(review);
  }

  TestValidator.predicate(
    "at least one review should be created",
    createdReviews.length > 0,
  );

  // 11. Switch back to admin for reviewVersions search
  const adminReloginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminRelogin);

  // Helper to assert all ratings in a page are within [min, max]
  const assertRatingsInRange = (
    page: IPageIShoppingMallReviewVersion.ISummary,
    min: number,
    max: number,
  ): void => {
    for (const v of page.data) {
      TestValidator.predicate(
        "review version rating within requested range",
        v.rating >= min && v.rating <= max,
      );
    }
  };

  // 12. Query high rating range (4–5) page 1 limit 10
  const highRangeRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    review_id: null,
    min_rating: 4 as number & tags.Type<"int32">,
    max_rating: 5 as number & tags.Type<"int32">,
    visibility_status: null,
    moderation_state: null,
    created_from: null,
    created_to: null,
    sort_field: null,
    sort_order: null,
  } satisfies IShoppingMallReviewVersion.IRequest;

  const highRangePage: IPageIShoppingMallReviewVersion.ISummary =
    await api.functional.shoppingMall.admin.reviewVersions.index(connection, {
      body: highRangeRequest,
    });
  typia.assert(highRangePage);

  assertRatingsInRange(highRangePage, 4, 5);
  TestValidator.predicate(
    "high-rating band total records is non-negative",
    highRangePage.pagination.records >= 0,
  );

  // 13. Query low rating range (1–2) with smaller limit and second page
  const lowRangeRequestPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    review_id: null,
    min_rating: 1 as number & tags.Type<"int32">,
    max_rating: 2 as number & tags.Type<"int32">,
    visibility_status: null,
    moderation_state: null,
    created_from: null,
    created_to: null,
    sort_field: null,
    sort_order: null,
  } satisfies IShoppingMallReviewVersion.IRequest;

  const lowRangePage1: IPageIShoppingMallReviewVersion.ISummary =
    await api.functional.shoppingMall.admin.reviewVersions.index(connection, {
      body: lowRangeRequestPage1,
    });
  typia.assert(lowRangePage1);
  assertRatingsInRange(lowRangePage1, 1, 2);

  const lowRangeRequestPage2 = {
    ...lowRangeRequestPage1,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallReviewVersion.IRequest;

  const lowRangePage2: IPageIShoppingMallReviewVersion.ISummary =
    await api.functional.shoppingMall.admin.reviewVersions.index(connection, {
      body: lowRangeRequestPage2,
    });
  typia.assert(lowRangePage2);
  assertRatingsInRange(lowRangePage2, 1, 2);

  TestValidator.equals(
    "low-rating band pagination pages consistent between page 1 and 2",
    lowRangePage1.pagination.pages,
    lowRangePage2.pagination.pages,
  );

  if (lowRangePage1.pagination.records > lowRangePage1.pagination.limit) {
    TestValidator.notEquals(
      "low-rating band page 1 and page 2 data differ when multiple pages exist",
      lowRangePage1.data,
      lowRangePage2.data,
    );
  }

  // 14. Query rating band with no expected matches (e.g., 6–10)
  const emptyRangeRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    review_id: null,
    min_rating: 6 as number & tags.Type<"int32">,
    max_rating: 10 as number & tags.Type<"int32">,
    visibility_status: null,
    moderation_state: null,
    created_from: null,
    created_to: null,
    sort_field: null,
    sort_order: null,
  } satisfies IShoppingMallReviewVersion.IRequest;

  const emptyRangePage: IPageIShoppingMallReviewVersion.ISummary =
    await api.functional.shoppingMall.admin.reviewVersions.index(connection, {
      body: emptyRangeRequest,
    });
  typia.assert(emptyRangePage);

  TestValidator.equals(
    "empty rating band returns zero records",
    emptyRangePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty rating band returns empty data array",
    emptyRangePage.data.length,
    0,
  );
  TestValidator.predicate(
    "empty rating band pages value non-negative",
    emptyRangePage.pagination.pages >= 0,
  );
}
