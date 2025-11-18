import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Verify partial update semantics for SKU-scoped customer reviews.
 *
 * Business purpose:
 *
 * - Ensure that PUT /shoppingMall/customer/skus/{skuId}/reviews/{reviewId}
 *   behaves as a sparse update according to IShoppingMallReview.IUpdate:
 *   omitted fields are preserved, provided fields are updated, and explicitly
 *   null-able fields are cleared when set to null.
 * - Exercise the realistic preconditions for being able to review a SKU:
 *   configuration data, seller product + SKU, customer purchase, and creation
 *   of an initial review.
 * - Ensure that only the authoring customer can perform the update (implicitly
 *   exercised by running the flow under a single authenticated customer
 *   context).
 *
 * High-level flow:
 *
 * 1. Admin bootstrap:
 *
 *    - Create a country (for addresses) using IShoppingMallCountry.ICreate.
 *    - Create a region under that country using IShoppingMallRegion.ICreate.
 *    - Create a shipping method (IShoppingMallShippingMethod.ICreate).
 *    - Create a payment method (IShoppingMallPaymentMethod.ICreate).
 *    - Create an inventory state (IShoppingMallSkuInventoryState.ICreate).
 * 2. Seller bootstrap:
 *
 *    - Register a seller and keep the email to allow later re-login in other tests
 *         if needed.
 *    - Create a product with IShoppingMallProduct.ICreate.
 *    - Attach the product to a category using IShoppingMallCategory.ICreate +
 *         IShoppingMallProductCategory.ICreate.
 *    - Create a SKU under the product with IShoppingMallSku.ICreate, using the
 *         previously created inventory state id and a positive
 *         inventory_quantity so that the SKU is purchasable.
 * 3. Customer bootstrap and checkout:
 *
 *    - Register a customer (IShoppingMallCustomerJoin.IRequest) and keep the
 *         authorized payload.
 *    - Create a customer address referencing the admin-created country and region
 *         (IShoppingMallCustomerAddress.ICreate).
 *    - Create a cart (IShoppingMallCart.ICreate) owned by the customer.
 *    - Add the SKU as a cart item (IShoppingMallCartItem.ICreate).
 *    - Create an order (IShoppingMallOrder.ICreate) referencing the cart, address
 *         snapshot, shipping method, and payment method with a single order
 *         item matching the SKU and quantity.
 * 4. Initial review creation:
 *
 *    - As the same customer, call POST /shoppingMall/customer/skus/{skuId}/reviews
 *         with IShoppingMallReview.ICreate body containing rating, title, and
 *         body so all updatable fields are populated.
 *    - Assert that the returned IShoppingMallReview has the given rating/title/body.
 * 5. Partial update scenario A (update only rating):
 *
 *    - Call PUT /shoppingMall/customer/skus/{skuId}/reviews/{reviewId} with body
 *         containing only { rating: newRating } leaving title and body
 *         omitted.
 *    - Assert via typia.assert that the response is a valid IShoppingMallReview.
 *    - Use TestValidator.equals to check:
 *
 *         - Rating has changed to newRating.
 *         - Title and body remain equal to the original values.
 * 6. Partial update scenario B (clear title, change body only):
 *
 *    - Call PUT again with body containing { title: null, body: newBody } and rating
 *         omitted.
 *    - Assert the response type and then verify:
 *
 *         - Rating remains equal to the value from scenario A.
 *         - Title is now null.
 *         - Body equals newBody.
 * 7. Sanity check ownership/authorization implicitly:
 *
 *    - The test runs entirely under a single customer authentication context so that
 *         all review operations succeed; no explicit negative test is needed
 *         here, but the positive path confirms that an authenticated customer
 *         can update their own review.
 */
export async function test_api_sku_review_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: admin join & login (join already authenticates) and create base config
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Country
  const countryCreate = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreate,
    });
  typia.assert<IShoppingMallCountry>(country);

  // Region
  const regionCreate = {
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
        body: regionCreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // Shipping method
  const shippingMethodCreate = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // Payment method
  const paymentMethodCreate = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Visa/Master",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // SKU inventory state
  const inventoryStateCreate = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 2. Seller bootstrap: join, login is implicit
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // Product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE",
    model_name: "SKU-REV-1",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.png" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Category and product-category link
  const categoryCreate = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // SKU under the product
  const skuCreate = {
    code: "REV-SKU-1" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: "1234567890123",
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: 12000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 3. Customer bootstrap and checkout
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // Customer address
  const addressCreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  // Create cart
  const cartCreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert<IShoppingMallCart>(cart);

  // Add SKU to cart
  const cartItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // Prepare order create payload
  const shippingSnapshot = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile("010"),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: "Seoul",
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreate = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: "KRW",
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 4. Initial review creation for the purchased SKU
  const initialRating = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const initialTitle = "Great product" as string &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  const initialBody = RandomGenerator.paragraph({ sentences: 6 }) as string &
    tags.MinLength<1>;
  const reviewCreate = {
    rating: initialRating,
    title: initialTitle,
    body: initialBody,
  } satisfies IShoppingMallReview.ICreate;

  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.skus.reviews.create(connection, {
      skuId: sku.id as string & tags.Format<"uuid">,
      body: reviewCreate,
    });
  typia.assert<IShoppingMallReview>(review);

  TestValidator.equals("initial rating", review.rating, initialRating);
  TestValidator.equals("initial title", review.title, initialTitle);
  TestValidator.equals("initial body", review.body, initialBody);

  // 5. Partial update A: update rating only, keep title/body untouched
  const updatedRating = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updateRatingOnly = {
    rating: updatedRating,
  } satisfies IShoppingMallReview.IUpdate;

  const reviewAfterRatingUpdate: IShoppingMallReview =
    await api.functional.shoppingMall.customer.skus.reviews.update(connection, {
      skuId: sku.id as string & tags.Format<"uuid">,
      reviewId: review.id as string & tags.Format<"uuid">,
      body: updateRatingOnly,
    });
  typia.assert<IShoppingMallReview>(reviewAfterRatingUpdate);

  TestValidator.equals(
    "rating updated while title/body preserved",
    reviewAfterRatingUpdate.rating,
    updatedRating,
  );
  TestValidator.equals(
    "title preserved after rating-only update",
    reviewAfterRatingUpdate.title,
    initialTitle,
  );
  TestValidator.equals(
    "body preserved after rating-only update",
    reviewAfterRatingUpdate.body,
    initialBody,
  );

  // 6. Partial update B: clear title (null) and change body, keep rating untouched
  const newBody = RandomGenerator.paragraph({ sentences: 5 }) as string &
    tags.MinLength<1>;
  const updateTitleNullBody = {
    title: null,
    body: newBody,
  } satisfies IShoppingMallReview.IUpdate;

  const reviewAfterTitleBodyUpdate: IShoppingMallReview =
    await api.functional.shoppingMall.customer.skus.reviews.update(connection, {
      skuId: sku.id as string & tags.Format<"uuid">,
      reviewId: review.id as string & tags.Format<"uuid">,
      body: updateTitleNullBody,
    });
  typia.assert<IShoppingMallReview>(reviewAfterTitleBodyUpdate);

  // Rating should remain from previous update
  TestValidator.equals(
    "rating preserved when only title/body updated",
    reviewAfterTitleBodyUpdate.rating,
    updatedRating,
  );
  // Title explicitly cleared
  TestValidator.equals(
    "title cleared to null when set to null",
    reviewAfterTitleBodyUpdate.title,
    null,
  );
  // Body updated
  TestValidator.equals(
    "body updated to new content",
    reviewAfterTitleBodyUpdate.body,
    newBody,
  );
}
