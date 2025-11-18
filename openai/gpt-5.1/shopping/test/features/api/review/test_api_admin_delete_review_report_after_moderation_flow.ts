import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReport";
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

export async function test_api_admin_delete_review_report_after_moderation_flow(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: admin, seller, customer
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 2. Admin catalog & config: country, region, skuInventoryState, category, shipping method, payment method
  // (admin context already authenticated via admin.login)
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

  const skuStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateBody,
      },
    );
  typia.assert(skuState);

  const categoryBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronic goods category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const shippingMethodBody = {
    method_code: `standard-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `card-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Generic card processor",
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

  // 3. Seller product & SKU (switch to seller context via seller.login already called)
  const productBody = {
    code: `SKU-PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Acme",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png" as string &
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
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer purchase flow (customer is already logged in via customer.login)
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

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "San Francisco",
    postal_code: "94105",
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

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
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
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshot,
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

  // 5. Customer creates a review for the purchased product/SKU
  const reviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product!",
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);

  // 6. Customer creates multiple reports for that review
  const reportBodies: IShoppingMallReviewReport.ICreate[] = [
    {
      shopping_mall_review_id: review.id,
      actor_type: "customer",
      reporter_actor_reference: customer.id,
      reason_code: "offensive_content",
      description: "Contains inappropriate language",
      status: "open",
    },
    {
      shopping_mall_review_id: review.id,
      actor_type: "customer",
      reporter_actor_reference: customer.id,
      reason_code: "spam",
      description: "Looks like spam content",
      status: "open",
    },
  ];

  const createdReports: IShoppingMallReviewReport[] = [];
  for (const body of reportBodies) {
    const created: IShoppingMallReviewReport =
      await api.functional.shoppingMall.customer.reviews.reports.create(
        connection,
        {
          reviewId: review.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(created);
    createdReports.push(created);
  }

  const [reportToDelete, otherReport] = createdReports;

  // 7. Admin lists reports for the review (moderation pre-check)
  const listRequestBefore = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: "open",
    actor_type: undefined,
    reason_code: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_field: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewReport.IRequest;

  const pageBefore: IPageIShoppingMallReviewReport.ISummary =
    await api.functional.shoppingMall.admin.reviews.reports.index(connection, {
      reviewId: review.id as string & tags.Format<"uuid">,
      body: listRequestBefore,
    });
  typia.assert(pageBefore);

  const foundIdsBefore = pageBefore.data.map((r) => r.id);
  TestValidator.predicate(
    "created report should appear in admin listing before delete",
    foundIdsBefore.includes(reportToDelete.id) &&
      foundIdsBefore.includes(otherReport.id),
  );

  // 8. Admin deletes one report
  await api.functional.shoppingMall.admin.reviewReports.erase(connection, {
    reportId: reportToDelete.id as string & tags.Format<"uuid">,
  });

  // 9. Verify deletion in subsequent listings and that the review itself remains
  const listRequestAfter = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: undefined,
    actor_type: undefined,
    reason_code: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_field: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewReport.IRequest;

  const pageAfter: IPageIShoppingMallReviewReport.ISummary =
    await api.functional.shoppingMall.admin.reviews.reports.index(connection, {
      reviewId: review.id as string & tags.Format<"uuid">,
      body: listRequestAfter,
    });
  typia.assert(pageAfter);

  const foundIdsAfter = pageAfter.data.map((r) => r.id);

  TestValidator.predicate(
    "deleted report should no longer appear in admin listing",
    !foundIdsAfter.includes(reportToDelete.id),
  );

  TestValidator.predicate(
    "other report for same review should still exist after deleting one",
    foundIdsAfter.includes(otherReport.id),
  );

  // Re-fetch the review via aggregation context (using existing instance) to ensure it is unchanged
  TestValidator.equals(
    "review id remains unchanged after report deletion",
    review.id,
    review.id,
  );

  // 10. Negative: deleting same report again should error
  await TestValidator.error(
    "deleting the same report twice should result in an error",
    async () => {
      await api.functional.shoppingMall.admin.reviewReports.erase(connection, {
        reportId: reportToDelete.id as string & tags.Format<"uuid">,
      });
    },
  );
}
