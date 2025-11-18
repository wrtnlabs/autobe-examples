import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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

export async function test_api_order_item_reviews_listing_after_multiple_verified_reviews(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: admin, seller, two customers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerBEmail = typia.random<string & tags.Format<"email">>();

  const commonPassword = "P@ssw0rd!" as string;

  // Admin join & login
  const adminJoinBody = {
    email: adminEmail,
    password: commonPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: commonPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogged);

  // Seller join & login
  const sellerJoinBody = {
    email: sellerEmail,
    password: commonPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerEmail,
    password: commonPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogged);

  // Customer A join
  const customerAJoinBody = {
    email: customerAEmail,
    password: commonPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // Customer B join
  const customerBJoinBody = {
    email: customerBEmail,
    password: commonPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // 2. Admin creates country, region, shipping method, payment method, inventory state, category
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
      { countryCode: country.country_code, body: regionBody },
    );
  typia.assert(region);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
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

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller creates product and SKU
  const productBody = {
    code: "SKU-PROD-001",
    title: "Test Product",
    summary: "Simple test product",
    description: "Detailed description of test product",
    brand: "TestBrand",
    model_name: "TB-001",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/test-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      { productId: product.id, body: productCategoryBody },
    );
  typia.assert(productCategory);

  const skuBody: IShoppingMallSku.ICreate = {
    code: "SKU-001" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: "1234567890123",
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // Helper to create customer order + payment + review
  async function createOrderAndReviewForCustomer(
    customer: IShoppingMallCustomer.IAuthorized,
    customerEmail: string & tags.Format<"email">,
  ): Promise<{
    order: IShoppingMallOrder;
    orderItem: IShoppingMallOrderItem;
    review: IShoppingMallReview;
  }> {
    // Login as this customer to ensure auth context
    const loginBody = {
      email: customerEmail,
      password: commonPassword,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;
    const logged: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, { body: loginBody });
    typia.assert(logged);

    // Create customer address
    const addressBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: RandomGenerator.name(2),
      line1: RandomGenerator.paragraph({ sentences: 2 }),
      line2: null,
      city: "Sample City",
      postal_code: "12345",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;
    const address: IShoppingMallCustomerAddress =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        { customerId: customer.id, body: addressBody },
      );
    typia.assert(address);

    // Create cart header (actor_type customer)
    const cartBody = {
      actor_type: "customer",
      status: "active",
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;
    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartBody,
      });
    typia.assert(cart);

    // Build order body referencing the SKU
    const orderItemsBody: IShoppingMallOrderItem.ICreate[] = [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ];

    const shippingAddressSnapshotBody = {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

    const orderBody = {
      cart_id: cart.id,
      currency_code: "USD",
      items: orderItemsBody,
      shipping_address_id: address.id,
      shipping_address_snapshot: shippingAddressSnapshotBody,
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

    const orderItem: IShoppingMallOrderItem = order.items[0];
    typia.assert<IShoppingMallOrderItem>(orderItem);

    // Create payment for full order amount
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
        { orderId: order.id, body: paymentBody },
      );
    typia.assert(payment);

    // Create review for the order item
    const reviewBody = {
      rating: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.orderItems.reviews.create(
        connection,
        {
          orderItemId: orderItem.id,
          body: reviewBody,
        },
      );
    typia.assert(review);

    return { order, orderItem, review };
  }

  // 4. Execute flows for Customer A and B
  const aResult = await createOrderAndReviewForCustomer(
    customerAAuth,
    customerAEmail,
  );
  const bResult = await createOrderAndReviewForCustomer(
    customerBAuth,
    customerBEmail,
  );

  // 5. As Customer A, list reviews for their order item
  const customerALoginAgainBody = {
    email: customerAEmail,
    password: commonPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerALoggedAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginAgainBody,
    });
  typia.assert(customerALoggedAgain);

  const pageA: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.orderItems.reviews.index(
      connection,
      {
        orderItemId: aResult.orderItem.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(pageA);

  // 6. Basic pagination validations
  const paginationA = pageA.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    paginationA.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive or zero",
    paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationA.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationA.pages >= 0,
  );

  // 7. Ensure at least one review exists for Customer A's order item
  TestValidator.predicate(
    "at least one review summary exists for Customer A's order item",
    pageA.data.length >= 1,
  );

  // Ensure that all reviews correspond to the requested order item and
  // that the review created by A is present in the listing.
  const reviewIdsForA = pageA.data.map((r) => r.id);

  TestValidator.predicate(
    "Customer A's review id is present in listing for their order item",
    reviewIdsForA.includes(aResult.review.id),
  );

  TestValidator.predicate(
    "no review from Customer B is returned for Customer A's order item",
    !reviewIdsForA.includes(bResult.review.id),
  );

  for (const summary of pageA.data) {
    // Type is already asserted by typia.assert on pageA, but validate
    // logical expectations.
    TestValidator.predicate(
      "review rating within 1-5 range",
      summary.rating >= 1 && summary.rating <= 5,
    );
    TestValidator.predicate(
      "verified_purchase is true for reviews created via order item endpoint",
      summary.verified_purchase === true,
    );
    TestValidator.predicate(
      "review product matches our created product",
      summary.product.id === product.id,
    );
    if (summary.sku !== null && summary.sku !== undefined) {
      TestValidator.equals(
        "review sku matches our shared sku",
        summary.sku.id,
        sku.id,
      );
    }
  }

  // 8. Optionally, as Customer B, list reviews for their own order item and
  // ensure their review appears.
  const customerBLoginAgainBody = {
    email: customerBEmail,
    password: commonPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerBLoggedAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginAgainBody,
    });
  typia.assert(customerBLoggedAgain);

  const pageB: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.orderItems.reviews.index(
      connection,
      {
        orderItemId: bResult.orderItem.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(pageB);

  const reviewIdsForB = pageB.data.map((r) => r.id);
  TestValidator.predicate(
    "Customer B's review id is present in listing for their order item",
    reviewIdsForB.includes(bResult.review.id),
  );
}
