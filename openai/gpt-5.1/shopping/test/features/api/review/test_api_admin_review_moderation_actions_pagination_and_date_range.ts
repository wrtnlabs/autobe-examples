import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationAction";
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
import type { IShoppingMallReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationAction";
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

export async function test_api_admin_review_moderation_actions_pagination_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create admin, seller, and customer accounts and log them in as needed.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword123!",
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPassword123!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  // 2. As admin, configure master data: country, region, sku inventory state, category, shipping, payment.
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  const countryBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1,
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

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Regular in-stock SKU",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Electronics",
    description_en: "Electronics category for testing",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping service",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard card payment",
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

  // 3. As seller, create product and SKU.
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: "Test Product",
    summary: "Test product summary",
    description: RandomGenerator.paragraph({ sentences: 10 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  await api.functional.auth.admin.login(connection, { body: adminLoginBody });
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

  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });
  const skuBody = {
    code: RandomGenerator.alphaNumeric(12),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. As customer, create address, cart, cart item, and order, then create a review.
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "00000",
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

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const shippingSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? "01000000000",
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: "Seoul",
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotBody,
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

  const reviewBody = {
    rating: 5,
    title: "Great product",
    body: "Everything worked as expected",
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);

  // 5. As admin, create a series of moderation actions for the review.
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  const moderationActions: IShoppingMallReviewModerationAction[] = [];
  const actionCount = 12;

  for (let i = 0; i < actionCount; i++) {
    const actionBody = {
      action_type: i % 2 === 0 ? "note" : "visibility_change",
      previous_visibility_status: i === 0 ? null : "visible",
      new_visibility_status: i % 2 === 0 ? "visible" : "hidden",
      previous_moderation_state: i === 0 ? null : "under_review",
      new_moderation_state: i % 2 === 0 ? "under_review" : "approved",
      reason_code: i % 3 === 0 ? "policy_violation" : "manual_check",
      note: `Action ${i + 1}`,
    } satisfies IShoppingMallReviewModerationAction.ICreate;

    const created: IShoppingMallReviewModerationAction =
      await api.functional.shoppingMall.admin.reviews.moderationActions.create(
        connection,
        {
          reviewId: review.id,
          body: actionBody,
        },
      );
    typia.assert(created);
    moderationActions.push(created);
  }

  TestValidator.equals(
    "created moderation actions count",
    moderationActions.length,
    actionCount,
  );

  // Sort actions by created_at ascending
  moderationActions.sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  // 6. Call index with pagination: page=1, limit=5; then page=2, limit=5.
  const baseRequest: IShoppingMallReviewModerationAction.IRequest = {
    page: 1,
    limit: 5,
    action_types: null,
    admin_ids: null,
    created_from: null,
    created_to: null,
    reason_codes: null,
    search: null,
    order_by_created_at_desc: true,
  };

  const page1: IPageIShoppingMallReviewModerationAction.ISummary =
    await api.functional.shoppingMall.admin.reviews.moderationActions.index(
      connection,
      {
        reviewId: review.id,
        body: baseRequest,
      },
    );
  typia.assert(page1);

  const page2: IPageIShoppingMallReviewModerationAction.ISummary =
    await api.functional.shoppingMall.admin.reviews.moderationActions.index(
      connection,
      {
        reviewId: review.id,
        body: {
          ...baseRequest,
          page: 2,
        },
      },
    );
  typia.assert(page2);

  const page1Ids = page1.data.map((a) => a.id);
  const page2Ids = page2.data.map((a) => a.id);

  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no overlap between page1 and page2", overlap.length, 0);

  const pagination1 = page1.pagination;
  const pagination2 = page2.pagination;

  TestValidator.equals("pagination1 current page", pagination1.current, 1);
  TestValidator.equals("pagination2 current page", pagination2.current, 2);
  TestValidator.equals("pagination limit", pagination1.limit, 5);
  TestValidator.equals(
    "pagination total records",
    pagination1.records,
    actionCount,
  );
  TestValidator.equals(
    "pagination pages",
    pagination1.pages,
    Math.ceil(actionCount / pagination1.limit),
  );

  // 7. Apply created_from filter to exclude earliest actions.
  const createdFrom = moderationActions[3]?.created_at;
  typia.assert<string & tags.Format<"date-time">>(createdFrom!);

  const filteredFrom: IPageIShoppingMallReviewModerationAction.ISummary =
    await api.functional.shoppingMall.admin.reviews.moderationActions.index(
      connection,
      {
        reviewId: review.id,
        body: {
          ...baseRequest,
          page: 1,
          created_from: createdFrom!,
        },
      },
    );
  typia.assert(filteredFrom);

  const expectedFromIds = moderationActions
    .filter((a) => a.created_at >= createdFrom!)
    .map((a) => a.id);

  TestValidator.equals(
    "created_from records count",
    filteredFrom.pagination.records,
    expectedFromIds.length,
  );

  const listedFromIds = filteredFrom.data.map((a) => a.id);
  TestValidator.predicate(
    "all returned actions satisfy created_from",
    listedFromIds.every((id) => expectedFromIds.includes(id)),
  );

  // 8. Apply created_from and created_to to restrict to a window.
  const fromIndex = 2;
  const toIndex = 7;
  const createdFromWindow = moderationActions[fromIndex]?.created_at;
  const createdToWindow = moderationActions[toIndex]?.created_at;
  typia.assert<string & tags.Format<"date-time">>(createdFromWindow!);
  typia.assert<string & tags.Format<"date-time">>(createdToWindow!);

  const filteredWindow: IPageIShoppingMallReviewModerationAction.ISummary =
    await api.functional.shoppingMall.admin.reviews.moderationActions.index(
      connection,
      {
        reviewId: review.id,
        body: {
          ...baseRequest,
          page: 1,
          created_from: createdFromWindow!,
          created_to: createdToWindow!,
        },
      },
    );
  typia.assert(filteredWindow);

  const expectedWindowIds = moderationActions
    .filter(
      (a) =>
        a.created_at >= createdFromWindow! && a.created_at <= createdToWindow!,
    )
    .map((a) => a.id);

  TestValidator.equals(
    "created_from+to records count",
    filteredWindow.pagination.records,
    expectedWindowIds.length,
  );

  const listedWindowIds = filteredWindow.data.map((a) => a.id);
  TestValidator.predicate(
    "all returned actions in window satisfy created_at range",
    listedWindowIds.every((id) => expectedWindowIds.includes(id)),
  );
}
