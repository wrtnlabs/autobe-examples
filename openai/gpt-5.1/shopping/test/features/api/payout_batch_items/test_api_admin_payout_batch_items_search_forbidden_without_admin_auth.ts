import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutItem";
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
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify RBAC on payout batch item search.
 *
 * This test builds a realistic scenario that yields at least one
 * IShoppingMallSellerPayoutItem in a payout batch, then verifies that only an
 * authenticated admin can search those items.
 *
 * Steps:
 *
 * 1. Bootstrap admin, seller and customer accounts via auth join/login APIs.
 * 2. As admin, create minimal master data: country, region, SKU inventory state,
 *    category, shipping method, payment method.
 * 3. As seller, create a product and SKU.
 * 4. As customer, create a cart, address, order and payment using the master data
 *    and SKU.
 * 5. As admin, create a seller earning tied to the order and create a payout batch
 *    plus at least one payout item.
 * 6. Call payoutBatches.items.index without auth and expect an error.
 * 7. Log in as customer, call payoutBatches.items.index and expect an error.
 * 8. Log in as seller, call payoutBatches.items.index and expect an error.
 * 9. Log back in as admin, call payoutBatches.items.index and expect success,
 *    asserting that at least one payout item is returned for that batch.
 */
export async function test_api_admin_payout_batch_items_search_forbidden_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create an admin account and obtain authorized context
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  const adminEmail = adminAuthorized.email;

  // 2. Create seller and customer accounts
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;

  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);
  const customerId = customerAuthorized.id;
  const customerEmail = customerAuthorized.email;

  // 3. Using admin auth, create country, region, SKU state, category, shipping method, payment method
  // Admin is already logged in from join
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
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
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const skuState =
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
  typia.assert<IShoppingMallSkuInventoryState>(skuState);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
        name_en: "General",
        description_en: null,
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `ship-${RandomGenerator.alphaNumeric(6)}`,
        display_name: "Standard Shipping",
        service_level_description: "Standard delivery",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `pay-${RandomGenerator.alphaNumeric(6)}`,
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

  // 4. As seller, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `prd-${RandomGenerator.alphaNumeric(6)}`,
        title: "Test Product",
        summary: "Test product summary",
        description: "Detailed description",
        brand: null,
        model_name: null,
        status: "active",
        primary_image_uri: null,
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
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `sku-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: skuState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 5. As customer, create cart, address, order and payment
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerId,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: "John Customer",
          line1: "123 Main St",
          line2: null,
          city: "Los Angeles",
          postal_code: "90001",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: orderIdNullableHelper(cart.id),
        currency_code: "USD",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: address.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method_id: paymentMethod.id,
          currency_code: order.currency_code,
          payable_amount: order.grand_total_amount,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 6. As admin, create seller earning, payout batch and payout item
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const earning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_order_item_id: null,
          shopping_mall_order_payment_id: orderPayment.id,
          currency_code: order.currency_code as string &
            tags.MinLength<1> &
            tags.MaxLength<3>,
          gross_amount: order.grand_total_amount,
          seller_discount_amount: 0,
          platform_discount_amount: 0,
          commission_amount: 0,
          other_fee_amount: 0,
          net_earning_amount: order.grand_total_amount,
          earning_type: "order_item" as string & tags.MinLength<1>,
          business_status: "eligible" as string & tags.MinLength<1>,
          eligible_at: order.created_at,
          reversed_at: null,
          metadata: null,
        } satisfies IShoppingMallSellerEarning.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earning);

  const batchBody = {
    batch_code: `pb-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: order.created_at,
    payout_period_end: order.created_at,
    currency_code: order.currency_code,
    total_gross_amount: earning.gross_amount,
    total_commission_amount: earning.commission_amount,
    total_net_payout_amount: earning.net_earning_amount,
    status: "draft",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: batchBody,
    });
  typia.assert<IShoppingMallSellerPayoutBatch>(payoutBatch);

  const payoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: {
          shopping_mall_seller_earning_id: earning.id,
          currency_code: payoutBatch.currencyCode,
          payout_amount: earning.net_earning_amount,
          status: "pending",
        } satisfies IShoppingMallSellerPayoutItem.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerPayoutItem>(payoutItem);

  // Helper to build a basic search request
  const buildSearchBody = (): IShoppingMallSellerPayoutItem.IRequest => ({
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: undefined,
    minPayoutAmount: undefined,
    maxPayoutAmount: undefined,
    paidFrom: undefined,
    paidTo: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  });

  // 7. Unauthenticated call: use a connection with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated payout items search must fail",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.items.index(
        unauthConnection,
        {
          batchCode: payoutBatch.batchCode,
          body: buildSearchBody(),
        },
      );
    },
  );

  // 8. Customer-authenticated call must fail
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "customer-auth payout items search must fail",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.items.index(
        connection,
        {
          batchCode: payoutBatch.batchCode,
          body: buildSearchBody(),
        },
      );
    },
  );

  // 9. Seller-authenticated call must fail
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "seller-auth payout items search must fail",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.items.index(
        connection,
        {
          batchCode: payoutBatch.batchCode,
          body: buildSearchBody(),
        },
      );
    },
  );

  // 10. Admin-authenticated call must succeed and return the created payout item
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const pageResult =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: buildSearchBody(),
      },
    );
  typia.assert<IPageIShoppingMallSellerPayoutItem.ISummary>(pageResult);

  TestValidator.predicate(
    "admin search must return at least one payout item",
    pageResult.data.length > 0,
  );

  const found = pageResult.data.find((item) => item.id === payoutItem.id);
  TestValidator.predicate(
    "created payout item must be included in admin search results",
    found !== undefined,
  );

  function orderIdNullableHelper(
    value: string & tags.Format<"uuid">,
  ): (string & tags.Format<"uuid">) | null {
    // Helper to satisfy IShoppingMallOrder.ICreate.cart_id type
    return value satisfies string as string & tags.Format<"uuid">;
  }
}
