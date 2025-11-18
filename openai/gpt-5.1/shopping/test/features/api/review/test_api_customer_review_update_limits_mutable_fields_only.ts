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
 * Validate that updating a customer review only mutates rating/title/body and
 * preserves identity associations.
 *
 * Business context:
 *
 * - A customer can edit an existing product review, but must never be able to
 *   re-bind the review to another customer, product, SKU, or order item. Those
 *   associations are managed purely by the backend.
 * - The IShoppingMallReview.IUpdate DTO only exposes `rating`, `title`, and
 *   `body` as optional fields, so any successful update must keep `customer`,
 *   `product`, `sku`, and `orderItem` identities unchanged.
 *
 * Scenario steps:
 *
 * 1. Bootstrap actors and configuration:
 *
 *    - Join/login an admin, seller, and customer using their respective auth
 *         endpoints. Tokens are handled automatically by the SDK; we just call
 *         join/login in the right order.
 *    - As admin, create a country, a region in that country, a shipping method, a
 *         payment method, and a purchasable SKU inventory state.
 * 2. Seller catalog setup:
 *
 *    - As seller, create a product with basic content and default locale.
 *    - As admin, assign the product to a category so it’s logically sellable.
 *    - As seller, create a SKU under that product using the previously created
 *         inventory state and an initial positive inventory quantity.
 * 3. Customer address/cart/order:
 *
 *    - As customer, create a shipping address pointing at the created
 *         country/region.
 *    - As customer, create a cart with actor_type "customer".
 *    - As customer, create an order that:
 *
 *         - Includes a single order item referencing the SKU,
 *         - Uses the saved customer address id as shipping_address_id,
 *         - References the admin-created shipping method and payment method, and
 *         - Has reasonable dummy notes.
 *    - Assert the created order and at least one order item exist and are wired
 *         correctly to the SKU.
 * 4. Customer creates initial review:
 *
 *    - As the same customer, call POST /shoppingMall/customer/reviews with a body
 *         satisfying IShoppingMallReview.ICreate (rating, title, body).
 *         Purchase linkage is handled by the backend using the authenticated
 *         customer and internal data; we just provide content.
 *    - Capture the returned review and typia.assert it. Record the identity
 *         associations:
 *
 *         - Review.id
 *         - Review.customer.id
 *         - Review.product.id
 *         - Review.sku?.id (may be null/undefined if review is product-level only)
 *         - Review.orderItem?.id (may be null/undefined) Also record the original
 *                   rating/title/body.
 * 5. Update review with new content:
 *
 *    - Build an IShoppingMallReview.IUpdate body that changes all three mutable
 *         fields:
 *
 *         - Rating: a different valid value from the original (e.g., if original was 5,
 *                   use 4).
 *         - Title: a new RandomGenerator.paragraph-based short title.
 *         - Body: a new RandomGenerator.content-based long body.
 *    - Call PUT /shoppingMall/customer/reviews/{reviewId} as the same customer,
 *         using api.functional. shoppingMall.customer.reviews.update.
 *    - Typia.assert the updated review.
 * 6. Validate content mutation and identity immutability:
 *
 *    - Use TestValidator.equals to ensure the updated review has:
 *
 *         - Rating equal to the new rating.
 *         - Title equal to the new title (handling nullability properly).
 *         - Body equal to the new body (handling nullability properly).
 *    - Use TestValidator.equals to ensure identity associations are unchanged:
 *
 *         - Customer.id still equals the original customerId.
 *         - Product.id still equals the original productId.
 *         - For sku and orderItem: if they were originally non-null, ensure the updated
 *                   review also has non-null associations with the exact same
 *                   ids; if they were null, ensure they remain null.
 *    - Additionally, verify that the review.id itself is unchanged between initial
 *         and updated responses.
 */
export async function test_api_customer_review_update_limits_mutable_fields_only(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: admin, seller, customer
  // Customer join
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  // Preserve customer id/email for later validations
  const customerId = customerAuthorized.id;

  // Admin join
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // Seller join
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  // 2. Admin config: country, region, shipping method, payment method, sku inventory state
  // Switch to admin context by logging in
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoggedIn);

  // Country
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // Region under the country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: RandomGenerator.name(2),
    region_type: "state",
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

  // Shipping method
  const shippingMethodCreateBody = {
    method_code: RandomGenerator.alphaNumeric(8),
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // Payment method
  const paymentMethodCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    display_name: "Credit Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // SKU inventory state
  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 3. Seller catalog: product, category link, SKU
  // Switch to seller context
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLoggedIn);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Switch back to admin to create a category and associate product
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminRelogin);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // Switch back to seller to create SKU
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerRelogin);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer address, cart, order
  // Switch to customer context via login
  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLoggedIn);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: productCreateBody.default_locale === "en-US" ? "USD" : "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // Build order with single item for the SKU
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver fast",
    platform_note: "test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  const firstOrderItem: IShoppingMallOrderItem = order.items[0];
  TestValidator.equals(
    "order item sku matches created sku",
    firstOrderItem.sku.id,
    sku.id,
  );

  // 5. Customer creates a review
  const initialRating = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.content({ paragraphs: 1 });

  const reviewCreateBody = {
    rating: initialRating,
    title: initialTitle,
    body: initialBody,
  } satisfies IShoppingMallReview.ICreate;
  const createdReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(createdReview);

  // Capture immutable identity fields and original content
  const originalReviewId = createdReview.id;
  const originalCustomerId = createdReview.customer.id;
  const originalProductId = createdReview.product.id;
  const originalSkuId = createdReview.sku?.id ?? null;
  const originalOrderItemId = createdReview.orderItem?.id ?? null;

  const originalRating = createdReview.rating;
  const originalTitle = createdReview.title ?? null;
  const originalBody = createdReview.body ?? null;

  // 6. Update review with new content
  const newRatingValueBase = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const newRating =
    originalRating === newRatingValueBase
      ? (3 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      : newRatingValueBase;

  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.content({ paragraphs: 1 });

  const updateBody = {
    rating: newRating,
    title: newTitle,
    body: newBody,
  } satisfies IShoppingMallReview.IUpdate;

  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: originalReviewId,
      body: updateBody,
    });
  typia.assert(updatedReview);

  // 7. Validate content mutation
  TestValidator.equals(
    "review id remains the same after update",
    updatedReview.id,
    originalReviewId,
  );

  TestValidator.equals(
    "rating updated to new value",
    updatedReview.rating,
    newRating,
  );

  TestValidator.equals(
    "title updated to new value",
    updatedReview.title ?? null,
    newTitle,
  );

  TestValidator.equals(
    "body updated to new value",
    updatedReview.body ?? null,
    newBody,
  );

  // 8. Validate identity immutability
  TestValidator.equals(
    "customer id remains unchanged",
    updatedReview.customer.id,
    originalCustomerId,
  );

  TestValidator.equals(
    "product id remains unchanged",
    updatedReview.product.id,
    originalProductId,
  );

  if (originalSkuId !== null) {
    TestValidator.predicate(
      "updated review still has a SKU association",
      updatedReview.sku !== null && updatedReview.sku !== undefined,
    );
    if (updatedReview.sku !== null && updatedReview.sku !== undefined) {
      TestValidator.equals(
        "sku id remains unchanged when originally present",
        updatedReview.sku.id,
        originalSkuId,
      );
    }
  } else {
    TestValidator.equals(
      "sku association remains null when originally null",
      updatedReview.sku ?? null,
      null,
    );
  }

  if (originalOrderItemId !== null) {
    TestValidator.predicate(
      "updated review still has an orderItem association",
      updatedReview.orderItem !== null && updatedReview.orderItem !== undefined,
    );
    if (
      updatedReview.orderItem !== null &&
      updatedReview.orderItem !== undefined
    ) {
      TestValidator.equals(
        "orderItem id remains unchanged when originally present",
        updatedReview.orderItem.id,
        originalOrderItemId,
      );
    }
  } else {
    TestValidator.equals(
      "orderItem association remains null when originally null",
      updatedReview.orderItem ?? null,
      null,
    );
  }

  // Additional sanity: original and updated rating/title/body differ where applicable
  TestValidator.predicate(
    "rating changed compared to original",
    updatedReview.rating !== originalRating,
  );

  if (originalTitle !== null) {
    TestValidator.predicate(
      "title changed compared to original when original was non-null",
      updatedReview.title !== originalTitle,
    );
  }

  if (originalBody !== null) {
    TestValidator.predicate(
      "body changed compared to original when original was non-null",
      updatedReview.body !== originalBody,
    );
  }
}
