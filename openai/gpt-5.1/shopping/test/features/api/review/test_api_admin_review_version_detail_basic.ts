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

export async function test_api_admin_review_version_detail_basic(
  connection: api.IConnection,
) {
  // 1. Multi-actor setup: customer, seller, admin
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 1-1) Customer join & login
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer_pw1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.join" as string & tags.Format<"uri">,
    referrer: "https://customer.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: "Customer_pw1234",
    ip: null,
    href: "https://customer.login" as string & tags.Format<"uri">,
    referrer: "https://customer.login.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 1-2) Seller join & login
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller_pw1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.join" as string & tags.Format<"uri">,
    referrer: "https://seller.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller_pw1234",
    ip: null,
    href: "https://seller.login" as string & tags.Format<"uri">,
    referrer: "https://seller.login.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 1-3) Admin join & login
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin_pw1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join" as string & tags.Format<"uri">,
    referrer: "https://admin.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: "Admin_pw1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.login" as string & tags.Format<"uri">,
    referrer: "https://admin.login.referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Catalog & configuration prerequisites (admin/seller flows)
  // 2-1) Admin: create country
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-2) Admin: create region under country
  const regionCreateBody = {
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
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 2-3) Admin: create category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 2-4) Admin: create SKU inventory state (purchasable)
  const skuStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateCreateBody,
      },
    );
  typia.assert(skuState);

  // 2-5) Admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: `standard_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 2-6) Admin: create payment method
  const paymentMethodCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 2-7) Seller: create product
  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Product",
    summary: "Test product summary",
    description: "Test product description",
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 2-8) Admin: link product to category
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

  // 2-9) Seller: create SKU under product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 3. Customer checkout flow
  // Re-login as customer to ensure customer token is active
  const customerRelogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerRelogin);

  // 3-1) Customer address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Main St",
    line2: null,
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerRelogin.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 3-2) Create cart
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

  // 3-3) Add cart item
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

  // 3-4) Create order
  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingAddressSnapshotCreateBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "0000000000",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver fast",
    platform_note: "autogenerated test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4. Customer review create & update
  const initialReviewRating = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const initialReviewTitle = "Great product";
  const initialReviewBody = "I like this product a lot";

  const reviewCreateBody = {
    rating: initialReviewRating,
    title: initialReviewTitle,
    body: initialReviewBody,
  } satisfies IShoppingMallReview.ICreate;

  const createdReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(createdReview);

  const updatedReviewRating = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedReviewTitle = "Good product";
  const updatedReviewBody = "After some use, still good but not perfect";

  const reviewUpdateBody = {
    rating: updatedReviewRating,
    title: updatedReviewTitle,
    body: updatedReviewBody,
  } satisfies IShoppingMallReview.IUpdate;

  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: createdReview.id,
      body: reviewUpdateBody,
    });
  typia.assert(updatedReview);

  // 5. Admin listing of review versions
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const versionsIndexBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    review_id: createdReview.id,
    min_rating: null,
    max_rating: null,
    visibility_status: null,
    moderation_state: null,
    created_from: null,
    created_to: null,
    sort_field: null,
    sort_order: null,
  } satisfies IShoppingMallReviewVersion.IRequest;

  const versionsPage: IPageIShoppingMallReviewVersion.ISummary =
    await api.functional.shoppingMall.admin.reviews.versions.index(connection, {
      reviewId: createdReview.id as string & tags.Format<"uuid">,
      body: versionsIndexBody,
    });
  typia.assert(versionsPage);

  TestValidator.predicate(
    "review versions pagination records >= 1",
    versionsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "review versions data length >= 1",
    versionsPage.data.length >= 1,
  );

  for (const summary of versionsPage.data) {
    TestValidator.equals(
      "summary.review_id equals createdReview.id",
      summary.review_id,
      createdReview.id,
    );
  }

  // pick last version summary
  const pickedSummary = versionsPage.data[versionsPage.data.length - 1];

  // 6. Admin detail for specific version
  const detail: IShoppingMallReviewVersion =
    await api.functional.shoppingMall.admin.reviews.versions.at(connection, {
      reviewId: createdReview.id,
      versionId: pickedSummary.id,
    });
  typia.assert(detail);

  // Basic equality checks between summary and detail
  TestValidator.equals(
    "detail.id equals pickedSummary.id",
    detail.id,
    pickedSummary.id,
  );
  TestValidator.equals(
    "detail.review_id equals created review id",
    detail.review_id,
    createdReview.id,
  );
  TestValidator.equals(
    "detail.rating equals summary.rating",
    detail.rating,
    pickedSummary.rating,
  );
  TestValidator.equals(
    "detail.title equals summary.title",
    detail.title ?? null,
    pickedSummary.title ?? null,
  );
  TestValidator.equals(
    "detail.visibility_status equals summary.visibility_status",
    detail.visibility_status,
    pickedSummary.visibility_status,
  );
  TestValidator.equals(
    "detail.moderation_state equals summary.moderation_state",
    detail.moderation_state,
    pickedSummary.moderation_state,
  );
  TestValidator.equals(
    "detail.verified_purchase equals summary.verified_purchase",
    detail.verified_purchase,
    pickedSummary.verified_purchase,
  );
  TestValidator.equals(
    "detail.incentivized equals summary.incentivized",
    detail.incentivized,
    pickedSummary.incentivized,
  );
  TestValidator.equals(
    "detail.snapshot_reason equals summary.snapshot_reason",
    detail.snapshot_reason ?? null,
    pickedSummary.snapshot_reason ?? null,
  );
  TestValidator.equals(
    "detail.created_at equals summary.created_at",
    detail.created_at,
    pickedSummary.created_at,
  );

  // 6-1. Consistency with create vs update payload by timeline
  // We compare pickedSummary.created_at against createdReview.created_at / updatedReview.updated_at.
  const pickedCreatedAt = new Date(detail.created_at).getTime();
  const reviewCreatedAt = new Date(createdReview.created_at).getTime();
  const reviewUpdatedAt = new Date(updatedReview.updated_at).getTime();

  // If snapshot is clearly after update time, expect updated payload; otherwise expect initial payload.
  if (pickedCreatedAt > reviewUpdatedAt) {
    TestValidator.equals(
      "snapshot rating matches updated rating when after update",
      detail.rating,
      updatedReviewRating,
    );
    TestValidator.equals(
      "snapshot title matches updated title when after update",
      detail.title ?? null,
      updatedReviewTitle,
    );
    TestValidator.equals(
      "snapshot body matches updated body when after update",
      detail.body ?? null,
      updatedReviewBody,
    );
  } else if (pickedCreatedAt <= reviewCreatedAt) {
    TestValidator.equals(
      "snapshot rating matches initial rating when at or before create",
      detail.rating,
      initialReviewRating,
    );
    TestValidator.equals(
      "snapshot title matches initial title when at or before create",
      detail.title ?? null,
      initialReviewTitle,
    );
    TestValidator.equals(
      "snapshot body matches initial body when at or before create",
      detail.body ?? null,
      initialReviewBody,
    );
  }
}
