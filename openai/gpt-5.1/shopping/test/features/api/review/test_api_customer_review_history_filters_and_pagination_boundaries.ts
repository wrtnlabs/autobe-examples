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

export async function test_api_customer_review_history_filters_and_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in to create catalog and configuration masters
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Admin creates country and region
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Electronics",
    description_en: "Electronics category for testing",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Admin creates SKU inventory state
  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuState);

  // 5. Admin creates shipping method
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 6. Admin creates payment method
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

  // 7. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 8. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: "Test Review Product",
    summary: "Product used for review pagination tests",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 9. Admin links product to category
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

  // 10. Seller creates a SKU under the product
  const skuCreateBody: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  };
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 11. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const customerId = customerLoggedIn.id;

  // 12. Customer creates a shipping address (used by orders)
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: "Test Street 1",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 13. Customer creates a cart and adds items
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // 14. Customer places an order from the cart
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

  const orderCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 15. Create a logical payment for the order
  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // Helper to pick the order item for review creation
  const firstOrderItem: IShoppingMallOrderItem | undefined =
    order.items.length > 0 ? order.items[0] : undefined;
  typia.assertGuard(firstOrderItem!);

  // 16. Seed reviews: create mix of customer-scoped, generic, and order-item reviews
  const totalReviews = 15;
  const ratings: (number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>)[] = [];
  for (let i = 0; i < totalReviews; i++) {
    const baseRating = (i % 5) + 1;
    ratings.push(
      baseRating as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
    );
  }

  const createdReviewSummaries: IShoppingMallReview.ISummary[] = [];

  // Create generic customer reviews
  for (let i = 0; i < 5; i++) {
    const createBody = {
      rating: ratings[i],
      title: `Generic Review ${i + 1}`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallReview.ICreate;
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: createBody,
      });
    typia.assert(review);

    const summaryLike: IShoppingMallReview.ISummary = {
      id: review.id,
      rating: review.rating,
      title: review.title ?? null,
      visibility_status: review.visibility_status,
      moderation_state: review.moderation_state,
      verified_purchase: review.verified_purchase,
      incentivized: review.incentivized,
      helpfulness_score: review.helpfulness_score,
      created_at: review.created_at,
      updated_at: review.updated_at,
      customer: review.customer,
      product: review.product,
      sku: review.sku ?? null,
    };
    createdReviewSummaries.push(summaryLike);
  }

  // Create customer-scoped reviews via /customers/{customerId}/reviews
  for (let i = 5; i < 10; i++) {
    const createBody = {
      rating: ratings[i],
      title: `Customer Review ${i + 1}`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallReview.ICreate;
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.customers.reviews.create(
        connection,
        {
          customerId,
          body: createBody,
        },
      );
    typia.assert(review);

    const summaryLike: IShoppingMallReview.ISummary = {
      id: review.id,
      rating: review.rating,
      title: review.title ?? null,
      visibility_status: review.visibility_status,
      moderation_state: review.moderation_state,
      verified_purchase: review.verified_purchase,
      incentivized: review.incentivized,
      helpfulness_score: review.helpfulness_score,
      created_at: review.created_at,
      updated_at: review.updated_at,
      customer: review.customer,
      product: review.product,
      sku: review.sku ?? null,
    };
    createdReviewSummaries.push(summaryLike);
  }

  // Create order-item-specific reviews to ensure verified purchase coverage
  for (let i = 10; i < totalReviews; i++) {
    const createBody = {
      rating: ratings[i],
      title: `OrderItem Review ${i + 1}`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallReview.ICreate;
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.orderItems.reviews.create(
        connection,
        {
          orderItemId: firstOrderItem!.id as string & tags.Format<"uuid">,
          body: createBody,
        },
      );
    typia.assert(review);

    const summaryLike: IShoppingMallReview.ISummary = {
      id: review.id,
      rating: review.rating,
      title: review.title ?? null,
      visibility_status: review.visibility_status,
      moderation_state: review.moderation_state,
      verified_purchase: review.verified_purchase,
      incentivized: review.incentivized,
      helpfulness_score: review.helpfulness_score,
      created_at: review.created_at,
      updated_at: review.updated_at,
      customer: review.customer,
      product: review.product,
      sku: review.sku ?? null,
    };
    createdReviewSummaries.push(summaryLike);
  }

  // Sort our local copy by created_at descending to mimic default behavior
  createdReviewSummaries.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // Helper to call index with a given body
  const queryCustomerReviews = async (
    body: IShoppingMallReview.IRequest,
  ): Promise<IPageIShoppingMallReview.ISummary> => {
    const page =
      await api.functional.shoppingMall.customer.customers.reviews.index(
        connection,
        {
          customerId,
          body,
        },
      );
    typia.assert(page);
    return page;
  };

  // 17. First request: page=1, limit=10 with no rating filters
  const requestPage1: IShoppingMallReview.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: null,
    max_rating: null,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  const page1 = await queryCustomerReviews(requestPage1);

  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page1 pagination records",
    page1.pagination.records,
    createdReviewSummaries.length,
  );

  // Page count should be 2 when totalReviews=15 and limit=10
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 2);

  TestValidator.equals("page1 data length", page1.data.length, 10);

  // Verify that the first page reviews match the latest 10 in our local list
  for (let i = 0; i < page1.data.length; i++) {
    const actual = page1.data[i];
    const expected = createdReviewSummaries[i];
    TestValidator.equals(`page1 review id #${i + 1}`, actual.id, expected.id);
  }

  // 18. Second request: page=2, limit=10 to get remaining reviews
  const requestPage2: IShoppingMallReview.IRequest = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: null,
    max_rating: null,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  const page2 = await queryCustomerReviews(requestPage2);

  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.equals("page2 pagination limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page2 pagination records",
    page2.pagination.records,
    createdReviewSummaries.length,
  );
  TestValidator.equals("page2 pagination pages", page2.pagination.pages, 2);

  const expectedRemainingCount =
    createdReviewSummaries.length > 10 ? createdReviewSummaries.length - 10 : 0;
  TestValidator.equals(
    "page2 data length",
    page2.data.length,
    expectedRemainingCount,
  );

  for (let i = 0; i < page2.data.length; i++) {
    const actual = page2.data[i];
    const expected = createdReviewSummaries[10 + i];
    TestValidator.equals(`page2 review id #${i + 1}`, actual.id, expected.id);
  }

  // 19. Third request: rating filter min_rating=4, max_rating=5
  const requestHighRating: IShoppingMallReview.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  const pageHighRating = await queryCustomerReviews(requestHighRating);

  const expectedHighRating = createdReviewSummaries.filter(
    (r) => r.rating >= 4 && r.rating <= 5,
  );
  TestValidator.equals(
    "high rating records",
    pageHighRating.pagination.records,
    expectedHighRating.length,
  );
  TestValidator.equals(
    "high rating data length",
    pageHighRating.data.length,
    expectedHighRating.length,
  );

  for (const review of pageHighRating.data) {
    TestValidator.predicate(
      "high rating filter applied",
      review.rating >= 4 && review.rating <= 5,
    );
  }

  // 20. Fourth request: date window around a known review timestamp
  const middleIndex = Math.floor(createdReviewSummaries.length / 2);
  const middleReview = createdReviewSummaries[middleIndex];
  const windowCenter = new Date(middleReview.created_at);
  const windowStart = new Date(windowCenter.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(windowCenter.getTime() + 5 * 60 * 1000);

  const requestDateWindow: IShoppingMallReview.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: null,
    max_rating: null,
    created_from: windowStart.toISOString(),
    created_to: windowEnd.toISOString(),
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  const pageDateWindow = await queryCustomerReviews(requestDateWindow);

  const expectedWithInWindow = createdReviewSummaries.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= windowStart.getTime() && t <= windowEnd.getTime();
  });
  TestValidator.equals(
    "date window records",
    pageDateWindow.pagination.records,
    expectedWithInWindow.length,
  );
  TestValidator.equals(
    "date window data length",
    pageDateWindow.data.length,
    expectedWithInWindow.length,
  );

  for (const review of pageDateWindow.data) {
    const t = new Date(review.created_at).getTime();
    TestValidator.predicate(
      "date window filter applied",
      t >= windowStart.getTime() && t <= windowEnd.getTime(),
    );
  }

  // 21. Request a page beyond total pages; expect empty data with same records/pages
  const beyondPage: IShoppingMallReview.IRequest = {
    page: page1.pagination.pages + 1,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: null,
    max_rating: null,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  const pageBeyond = await queryCustomerReviews(beyondPage);

  TestValidator.equals(
    "beyond page current",
    pageBeyond.pagination.current,
    beyondPage.page,
  );
  TestValidator.equals(
    "beyond page records",
    pageBeyond.pagination.records,
    createdReviewSummaries.length,
  );
  TestValidator.equals(
    "beyond page pages",
    pageBeyond.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.equals("beyond page data length", pageBeyond.data.length, 0);
}
