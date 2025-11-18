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

export async function test_api_admin_review_report_reclassification_and_notes_update(
  connection: api.IConnection,
) {
  // 1. Create base emails for actors
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Join customer
  const customerJoinBody = {
    email: customerEmail,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.local/join" as string & tags.Format<"uri">,
    referrer: "https://customer.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Join seller
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Join admin
  const adminJoinBody = {
    email: adminEmail,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, configure country
  const countryCode = "KR";
  const countryCreateBody = {
    country_code: countryCode,
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

  // 6. As admin, configure region under country
  const regionCode = "SEOUL";
  const regionCreateBody = {
    code: regionCode,
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 7. As admin, create shipping method
  const shippingMethodCode = "standard";
  const shippingMethodCreateBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 8. As admin, create payment method
  const paymentMethodCode = "card";
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
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
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 9. As admin, create category
  const categoryCreateBody = {
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
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 10. As admin, create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
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

  // 11. As seller, create product
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.local/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 12. As admin, link product to category
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

  // 13. As seller, create SKU under product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 14. As customer, create a cart
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

  // 15. As customer, add SKU to cart
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

  // 16. As customer, create shipping address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: "123 Test Street",
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 17. As customer, create an order
  const shippingAddressSnapshotCreateBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "000-0000-0000",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.code,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreateBody: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
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

  // 18. As customer, create a review for the product
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product",
    body: "Works as expected",
  } satisfies IShoppingMallReview.ICreate;

  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 19. As customer, create initial review report
  const initialReasonCode = "offensive_content";
  const initialDescription = "Customer flags this review as offensive.";

  const reviewReportCreateBody = {
    shopping_mall_review_id: review.id,
    actor_type: "customer",
    reporter_actor_reference: customerAuthorized.id,
    reason_code: initialReasonCode,
    description: initialDescription,
    status: "open",
  } satisfies IShoppingMallReviewReport.ICreate;

  const createdReport: IShoppingMallReviewReport =
    await api.functional.shoppingMall.customer.reviewReports.create(
      connection,
      {
        body: reviewReportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 20. As admin, update review report: reclassify reason and add notes
  const newReasonCode = "spam";
  const newDescription = "Admin reclassified as spam and added notes.";

  const updateBody: IShoppingMallReviewReport.IUpdate = {
    actor_type: createdReport.actor_type,
    reporter_actor_reference: createdReport.reporter_actor_reference ?? null,
    reason_code: newReasonCode,
    description: newDescription,
    status: createdReport.status,
  };

  const updatedReport: IShoppingMallReviewReport =
    await api.functional.shoppingMall.admin.reviewReports.update(connection, {
      reportId: createdReport.id as string & tags.Format<"uuid">,
      body: updateBody,
    });
  typia.assert(updatedReport);

  // 21. Validate invariants and updated fields
  TestValidator.equals(
    "report id remains unchanged after update",
    updatedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report status remains open",
    updatedReport.status,
    createdReport.status,
  );

  TestValidator.equals(
    "reason_code has been updated",
    updatedReport.reason_code,
    newReasonCode,
  );

  TestValidator.equals(
    "description has been updated",
    updatedReport.description,
    newDescription,
  );

  TestValidator.equals(
    "created_at remains unchanged",
    updatedReport.created_at,
    createdReport.created_at,
  );

  TestValidator.predicate("updated_at is not earlier than original", () => {
    const before = new Date(createdReport.updated_at).getTime();
    const after = new Date(updatedReport.updated_at).getTime();
    return after >= before;
  });

  TestValidator.equals(
    "embedded review id remains linked",
    updatedReport.review.id,
    createdReport.review.id,
  );

  TestValidator.equals(
    "embedded review product id remains linked",
    updatedReport.review.product.id,
    createdReport.review.product.id,
  );

  if (createdReport.review.customer && updatedReport.review.customer) {
    TestValidator.equals(
      "embedded review customer id remains linked",
      updatedReport.review.customer.id,
      createdReport.review.customer.id,
    );
  }

  // 22. Optional: second update to ensure repeated updates work
  const secondReasonCode = "other";
  const secondDescription = "Second reclassification with more detailed notes.";

  const secondUpdateBody: IShoppingMallReviewReport.IUpdate = {
    actor_type: updatedReport.actor_type,
    reporter_actor_reference: updatedReport.reporter_actor_reference ?? null,
    reason_code: secondReasonCode,
    description: secondDescription,
    status: updatedReport.status,
  };

  const secondUpdatedReport: IShoppingMallReviewReport =
    await api.functional.shoppingMall.admin.reviewReports.update(connection, {
      reportId: updatedReport.id as string & tags.Format<"uuid">,
      body: secondUpdateBody,
    });
  typia.assert(secondUpdatedReport);

  TestValidator.equals(
    "second update keeps id stable",
    secondUpdatedReport.id,
    updatedReport.id,
  );

  TestValidator.equals(
    "second update keeps status unchanged",
    secondUpdatedReport.status,
    updatedReport.status,
  );

  TestValidator.equals(
    "second update sets new reason_code",
    secondUpdatedReport.reason_code,
    secondReasonCode,
  );

  TestValidator.equals(
    "second update sets new description",
    secondUpdatedReport.description,
    secondDescription,
  );

  TestValidator.equals(
    "second update preserves created_at",
    secondUpdatedReport.created_at,
    createdReport.created_at,
  );

  TestValidator.predicate("second updated_at advances or stays same", () => {
    const first = new Date(updatedReport.updated_at).getTime();
    const second = new Date(secondUpdatedReport.updated_at).getTime();
    return second >= first;
  });

  TestValidator.equals(
    "second update preserves embedded review id",
    secondUpdatedReport.review.id,
    createdReport.review.id,
  );

  TestValidator.equals(
    "second update preserves embedded review product id",
    secondUpdatedReport.review.product.id,
    createdReport.review.product.id,
  );

  if (createdReport.review.customer && secondUpdatedReport.review.customer) {
    TestValidator.equals(
      "second update preserves embedded review customer id",
      secondUpdatedReport.review.customer.id,
      createdReport.review.customer.id,
    );
  }
}
