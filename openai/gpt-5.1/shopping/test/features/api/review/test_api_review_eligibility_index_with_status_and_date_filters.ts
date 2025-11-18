import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewEligibility";
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
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
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

export async function test_api_review_eligibility_index_with_status_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customers join/login
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoin.email,
      password: "Admin1234!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!" as string & tags.Format<"password">,
      ip: null,
      href: "https://seller.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoin.email,
      password: "Seller1234!",
      ip: null,
      href: "https://seller.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const customer1Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!" as string & tags.Format<"password">,
      ip: null,
      href: "https://customer.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer1Join);

  const customer1Login = await api.functional.auth.customer.login(connection, {
    body: {
      email: customer1Join.email,
      password: "Customer1234!",
      ip: null,
      href: "https://customer.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer1Login);

  // 2. As admin, configure country, region, sku inventory state, shipping & payment methods, category
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "KR",
        name_en: "Korea",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "SEOUL",
          name_en: "Seoul",
          region_type: "city",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Available for purchase",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "Standard shipping",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: "electronics",
        name_en: "Electronics",
        description_en: "Electronics category",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 3. Switch to seller (already logged in) and create product + SKU
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.name(2),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "Model-1",
        status: "active",
        primary_image_uri: "https://example.com/image.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(6) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Switch to customer1 (already logged in) and create address, cart, item, order
  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer1Login.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "Line1",
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

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

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cart.id,
        currency_code: cart.currency_code,
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: null,
        shipping_address_snapshot: shippingSnapshot,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  const targetOrderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(targetOrderItem);

  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // 5. Filter by status "eligible" and eligible_from range including now
  const eligiblePage =
    await api.functional.shoppingMall.customer.orderItems.reviewEligibilities.index(
      connection,
      {
        orderItemId: targetOrderItem.id,
        body: {
          customer_id: order.customer?.id ?? null,
          product_id: order.items[0].sku.id,
          sku_id: order.items[0].sku.id,
          order_item_id: targetOrderItem.id,
          status: "eligible",
          eligible_from_from: from,
          eligible_from_to: to,
          eligible_until_from: null,
          eligible_until_to: null,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "eligible_from",
          sort_direction: "asc",
        } satisfies IShoppingMallReviewEligibility.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(eligiblePage);

  // Validate that all results match filters when any exist
  for (const summary of eligiblePage.data) {
    typia.assert<IShoppingMallReviewEligibility.ISummary>(summary);
    TestValidator.equals(
      "eligibility status must be eligible",
      summary.status,
      "eligible",
    );
    const eligibleFromTime = new Date(summary.eligible_from).getTime();
    TestValidator.predicate(
      "eligible_from within requested range",
      eligibleFromTime >= new Date(from).getTime() &&
        eligibleFromTime <= new Date(to).getTime(),
    );
    if (order.customer !== null) {
      TestValidator.equals(
        "eligibility customer id matches order customer",
        summary.customer.id,
        order.customer.id,
      );
    }
  }

  // 6. Call again with a combination that should return empty (future window)
  const farFutureFrom = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureTo = new Date(
    now.getTime() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const emptyPage =
    await api.functional.shoppingMall.customer.orderItems.reviewEligibilities.index(
      connection,
      {
        orderItemId: targetOrderItem.id,
        body: {
          customer_id: order.customer?.id ?? null,
          product_id: order.items[0].sku.id,
          sku_id: order.items[0].sku.id,
          order_item_id: targetOrderItem.id,
          status: "expired",
          eligible_from_from: farFutureFrom,
          eligible_from_to: farFutureTo,
          eligible_until_from: null,
          eligible_until_to: null,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "eligible_from",
          sort_direction: "asc",
        } satisfies IShoppingMallReviewEligibility.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(emptyPage);

  TestValidator.equals(
    "future expired filter should return empty data",
    emptyPage.data.length,
    0,
  );

  // 7. Second customer cannot see first customer's eligibilities
  const customer2Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer2345!" as string & tags.Format<"password">,
      ip: null,
      href: "https://customer2.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer2Join);

  const customer2Login = await api.functional.auth.customer.login(connection, {
    body: {
      email: customer2Join.email,
      password: "Customer2345!",
      ip: null,
      href: "https://customer2.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer2Login);

  const crossPage =
    await api.functional.shoppingMall.customer.orderItems.reviewEligibilities.index(
      connection,
      {
        orderItemId: targetOrderItem.id,
        body: {
          customer_id: customer2Login.id,
          product_id: order.items[0].sku.id,
          sku_id: order.items[0].sku.id,
          order_item_id: targetOrderItem.id,
          status: null,
          eligible_from_from: null,
          eligible_from_to: null,
          eligible_until_from: null,
          eligible_until_to: null,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: null,
          sort_direction: null,
        } satisfies IShoppingMallReviewEligibility.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(crossPage);

  for (const summary of crossPage.data) {
    typia.assert<IShoppingMallReviewEligibility.ISummary>(summary);
    TestValidator.equals(
      "eligibility customer must match authenticated customer2",
      summary.customer.id,
      customer2Login.id,
    );
  }
}
