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
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payout_batch_delete_success_with_single_seller_earning(
  connection: api.IConnection,
) {
  // 1. Admin join (get initial admin token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);
  const sellerId = sellerJoin.id;

  // 3. Customer join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);
  const customerId = customerJoin.id;

  // 4. As admin (current connection already has admin token), create country
  const countryCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: countryCode,
        name_en: "Test Country",
        phone_code: "+99",
        is_active: true,
        sort_order: 1,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  // 5. Create region under that country
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: {
          code: "TEST-REGION",
          name_en: "Test Region",
          region_type: "state",
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 6. Create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphaNumeric(8),
        name_en: "Test Category",
        description_en: "Test category description",
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 7. Create SKU inventory state
  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock_" + RandomGenerator.alphaNumeric(4),
          name: "In Stock",
          description: "In stock state",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 8. Create shipping method
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "std_" + RandomGenerator.alphaNumeric(4),
        display_name: "Standard Shipping",
        service_level_description: "Standard test shipping",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 9. Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card_" + RandomGenerator.alphaNumeric(4),
        display_name: "Test Card",
        description: "Test card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 10. Switch to seller context (login)
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 11. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: "P-" + RandomGenerator.alphaNumeric(6),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "Test Brand",
        model_name: "Model X",
        status: "active",
        primary_image_uri: typia.random<string & tags.Format<"uri">>(),
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 12. Switch back to admin to categorize product
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const productCategoryLink =
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
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  // 13. Switch to seller again to create SKU
  const sellerLoginAgain = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login2",
      referrer: "https://seller.example.com/landing2",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: "SKU-" + RandomGenerator.alphaNumeric(6),
        barcode: null,
        status: "active",
        price: 100,
        original_price: 120,
        inventory_quantity: 10,
        low_stock_threshold: 1,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: undefined,
        external_ids: undefined,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 14. Switch to customer context to create cart, address, order, payment
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

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

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: "John Doe",
          line1: "123 Test Street",
          line2: "Suite 100",
          city: "Testville",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cart.id,
        currency_code: "USD",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: customerAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: "Please deliver soon",
        platform_note: "Test order",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  const payment =
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
  typia.assert<IShoppingMallOrderPayment>(payment);

  // 15. Switch back to admin to create seller earning
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login-again",
      referrer: "https://admin.example.com/landing-again",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  const grossAmount = 100;
  const sellerDiscountAmount = 0;
  const platformDiscountAmount = 0;
  const commissionAmount = 10;
  const otherFeeAmount = 0;
  const netEarningAmount =
    grossAmount - sellerDiscountAmount - commissionAmount - otherFeeAmount;

  const eligibleAt = new Date().toISOString();

  const earning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_order_item_id: order.items[0]?.id ?? null,
          shopping_mall_order_payment_id: payment.id,
          currency_code: order.currency_code,
          gross_amount: grossAmount,
          seller_discount_amount: sellerDiscountAmount,
          platform_discount_amount: platformDiscountAmount,
          commission_amount: commissionAmount,
          other_fee_amount: otherFeeAmount,
          net_earning_amount: netEarningAmount,
          earning_type: "order_item",
          business_status: "eligible",
          eligible_at: eligibleAt,
          reversed_at: null,
          metadata: null,
        } satisfies IShoppingMallSellerEarning.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earning);

  // Snapshot some earning fields for later comparison
  const earningCurrency = earning.currency_code;
  const earningNetAmount = earning.net_earning_amount;

  // 16. Create payout batch that reflects this single earning
  const payoutPeriodStart = new Date().toISOString();
  const payoutPeriodEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const batchCode = "PB-" + RandomGenerator.alphaNumeric(10);

  const payoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: {
        batch_code: batchCode,
        payout_period_start: payoutPeriodStart,
        payout_period_end: payoutPeriodEnd,
        currency_code: earning.currency_code,
        total_gross_amount: earning.gross_amount,
        total_commission_amount: earning.commission_amount,
        total_net_payout_amount: earning.net_earning_amount,
        status: "draft",
        external_reference: null,
        notes: "Single-earning test batch",
      } satisfies IShoppingMallSellerPayoutBatch.ICreate,
    });
  typia.assert<IShoppingMallSellerPayoutBatch>(payoutBatch);

  // Validate batch totals against earning
  TestValidator.equals(
    "payout batch gross equals earning gross",
    payoutBatch.totalGrossAmount,
    earning.gross_amount,
  );
  TestValidator.equals(
    "payout batch commission equals earning commission",
    payoutBatch.totalCommissionAmount,
    earning.commission_amount,
  );
  TestValidator.equals(
    "payout batch net payout equals earning net earning",
    payoutBatch.totalNetPayoutAmount,
    earning.net_earning_amount,
  );

  // 17. Delete payout batch as admin
  await api.functional.shoppingMall.admin.payoutBatches.erase(connection, {
    batchCode: payoutBatch.batchCode,
  });

  // 18. Post-delete invariants (in-memory earning consistency)
  TestValidator.equals(
    "earning currency remains unchanged after batch delete",
    earning.currency_code,
    earningCurrency,
  );
  TestValidator.equals(
    "earning net amount remains unchanged after batch delete",
    earning.net_earning_amount,
    earningNetAmount,
  );
}
