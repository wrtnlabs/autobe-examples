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
import type { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
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

export async function test_api_admin_review_report_detail_basic(
  connection: api.IConnection,
) {
  // 1. Create base actors: customer, seller, admin
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Seller creates catalog backbone: country, region, category, product, sku inventory state, sku
  // Login as seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // Country
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code:
      "+" +
      String(
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
        >(),
      ),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryCreateBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  // Region under the country
  const regionCreateBody = {
    code: RandomGenerator.alphabets(5),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    region_type: RandomGenerator.paragraph({ sentences: 1 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallRegion.ICreate;
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // Category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryCreateBody },
  );
  typia.assert<IShoppingMallCategory>(category);

  // Product (seller-owned)
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Link product to category (admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // SKU inventory state (admin)
  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // Switch back to seller to create SKU
  const sellerLogin2 = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin2);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: typia.random<number & tags.Minimum<0>>(),
    original_price: null,
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 3. Customer buying flow: login as customer, create cart, address, cart item
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: productCreateBody.default_locale === "en-US" ? "USD" : "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreateBody },
  );
  typia.assert<IShoppingMallCart>(cart);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 3.b Admin creates shipping and payment methods
  const adminLogin2 = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin2);

  const shippingMethodCreateBody = {
    method_code: RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // Switch back to customer for order creation
  const customerLogin2 = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin2);

  const shippingSnapshotBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 3.c Create order payment
  const orderPaymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 4. Customer writes a review
  const reviewRating = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const reviewCreateBody = {
    rating: reviewRating,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallReview.ICreate;
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    { body: reviewCreateBody },
  );
  typia.assert<IShoppingMallReview>(review);

  // 5. Customer submits a review report
  const reviewReportCreateBody = {
    shopping_mall_review_id: review.id,
    actor_type: "customer",
    reporter_actor_reference: customerLogin2.id,
    reason_code: "offensive_content",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "open",
  } satisfies IShoppingMallReviewReport.ICreate;
  const createdReport =
    await api.functional.shoppingMall.customer.reviewReports.create(
      connection,
      {
        body: reviewReportCreateBody,
      },
    );
  typia.assert<IShoppingMallReviewReport>(createdReport);

  // 6. Admin retrieves report detail
  const adminLogin3 = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin3);

  const reportDetail = await api.functional.shoppingMall.admin.reviewReports.at(
    connection,
    {
      reportId: createdReport.id,
    },
  );
  typia.assert<IShoppingMallReviewReport>(reportDetail);

  // 7. Business assertions on report detail
  TestValidator.equals(
    "report id should match",
    reportDetail.id,
    createdReport.id,
  );
  TestValidator.equals(
    "actor type should be customer",
    reportDetail.actor_type,
    reviewReportCreateBody.actor_type,
  );
  TestValidator.equals(
    "reason code should match",
    reportDetail.reason_code,
    reviewReportCreateBody.reason_code,
  );
  TestValidator.equals(
    "status should match",
    reportDetail.status,
    reviewReportCreateBody.status,
  );
  TestValidator.equals(
    "description should match",
    reportDetail.description,
    reviewReportCreateBody.description,
  );
  TestValidator.equals(
    "deleted_at should be null for active report",
    reportDetail.deleted_at,
    null,
  );

  // Embedded review summary assertions
  TestValidator.equals(
    "embedded review id should match",
    reportDetail.review.id,
    review.id,
  );
  TestValidator.equals(
    "embedded review rating should match",
    reportDetail.review.rating,
    review.rating,
  );
  TestValidator.equals(
    "embedded review product id should match",
    reportDetail.review.product.id,
    product.id,
  );

  if (
    reportDetail.review.sku !== null &&
    reportDetail.review.sku !== undefined
  ) {
    TestValidator.equals(
      "embedded review sku id should match",
      reportDetail.review.sku.id,
      sku.id,
    );
  }

  TestValidator.predicate(
    "report created_at should be <= updated_at",
    new Date(reportDetail.created_at).getTime() <=
      new Date(reportDetail.updated_at).getTime(),
  );
}
