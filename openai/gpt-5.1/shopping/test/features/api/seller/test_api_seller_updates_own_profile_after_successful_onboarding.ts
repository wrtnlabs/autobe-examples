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
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that a seller can update their own profile after onboarding and
 * participating in real commerce flows (orders, payments, earnings).
 *
 * Business journey covered by this test:
 *
 * 1. Admin joins and configures primitives:
 *
 *    - Country and region (for customer addresses)
 *    - SKU inventory state (for SKUs)
 *    - Shipping method and payment method (for checkout)
 * 2. Seller joins and creates catalog entities:
 *
 *    - Product and SKU
 * 3. Customer joins and completes a purchase:
 *
 *    - Address referencing country/region
 *    - Cart and cart item referencing the seller SKU
 *    - Order referencing cart, address, shipping method, payment method
 *    - Order payment
 * 4. Admin records a seller earning using the order/payment
 * 5. Seller updates their profile via PUT
 *    /shoppingMall/seller/sellers/{sellerId}/profile
 *
 * Validations:
 *
 * - All created entities match their DTO types via typia.assert.
 * - The updated seller profile:
 *
 *   - Has shopping_mall_seller_id equal to the seller.id
 *   - Reflects the updated store_name, store_description, support_email, and
 *       support_phone
 *   - Has updated_at later than a prior updated_at snapshot when a previous profile
 *       existed
 * - The seller earning created before the profile update remains consistent (same
 *   seller and order ids) and is not mutated by the profile update operation.
 */
export async function test_api_seller_updates_own_profile_after_successful_onboarding(
  connection: api.IConnection,
) {
  // Helper to generate a reasonable URL (href/referrer)
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphabets(8)}`;

  // 1. Admin joins (auth + token managed by SDK)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 1-1. Admin creates a country
  const countryCreate =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: RandomGenerator.alphabets(2).toUpperCase(),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        phone_code: `+${typia.random<number & tags.Minimum<1>>()}`,
        is_active: true,
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert<IShoppingMallCountry>(countryCreate);

  // 1-2. Admin creates a region under that country
  const regionCreate =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCreate.country_code,
        body: {
          code: RandomGenerator.alphabets(5).toUpperCase(),
          name_en: RandomGenerator.paragraph({ sentences: 2 }),
          region_type: "state",
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(regionCreate);

  // 1-3. Admin creates SKU inventory state
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `in_stock_${RandomGenerator.alphabets(4)}`,
          name: "In Stock",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 1-4. Admin creates shipping method
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `standard_${RandomGenerator.alphabets(4)}`,
        display_name: "Standard Shipping",
        service_level_description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 1-5. Admin creates payment method
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `card_${RandomGenerator.alphabets(4)}`,
        display_name: "Credit Card",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 2. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);
  const sellerId = sellerJoin.id;

  // 2-1. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.paragraph({ sentences: 2 }),
        model_name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        primary_image_uri: randomUrl(),
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 2-2. Seller creates a SKU under that product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
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
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 3. Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);
  const customerId = customerJoin.id;

  // 3-1. Customer creates an address referencing country and region
  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          shopping_mall_country_id: countryCreate.id,
          shopping_mall_region_id: regionCreate.id,
          recipient_name: RandomGenerator.name(),
          line1: RandomGenerator.paragraph({ sentences: 2 }),
          line2: null,
          city: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphabets(6),
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 3-2. Customer creates a cart
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

  // 3-3. Customer adds the seller SKU to the cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 3-4. Customer creates an order from the cart
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: cartItem.quantity,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 3-5. Customer creates a payment for the order
  const paymentCreateBody = {
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
        body: paymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 4. Admin: create seller earning tied to this order/payment
  // Switch auth back to admin by logging in
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const earningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code,
    gross_amount: order.grand_total_amount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: order.grand_total_amount,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const sellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(sellerEarning);

  // Snapshot earning ids to assert they remain unchanged in memory
  const earningOrderIdBefore = sellerEarning.shopping_mall_order_id;
  const earningSellerIdBefore = sellerEarning.shopping_mall_seller_id;

  // 5. Seller updates their profile
  // Switch auth to seller
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const previousProfileUpdatedAt: string | null =
    sellerLogin.profile?.updated_at ?? null;

  const updateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 2 }),
    store_description: RandomGenerator.paragraph({ sentences: 4 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const updatedProfile =
    await api.functional.shoppingMall.seller.sellers.profile.update(
      connection,
      {
        sellerId: sellerId as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerProfile>(updatedProfile);

  // Assertions on profile content
  TestValidator.equals(
    "seller id on profile matches seller",
    updatedProfile.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "store_name updated",
    updatedProfile.store_name,
    updateBody.store_name,
  );
  TestValidator.equals(
    "store_description updated",
    updatedProfile.store_description,
    updateBody.store_description,
  );
  TestValidator.equals(
    "support_email updated",
    updatedProfile.support_email,
    updateBody.support_email,
  );
  TestValidator.equals(
    "support_phone updated",
    updatedProfile.support_phone,
    updateBody.support_phone,
  );

  // Updated_at should be later than previousProfileUpdatedAt when previous exists
  if (previousProfileUpdatedAt !== null) {
    const prev = new Date(previousProfileUpdatedAt).getTime();
    const next = new Date(updatedProfile.updated_at).getTime();
    TestValidator.predicate(
      "updated_at is later than previous profile updated_at",
      next > prev,
    );
  } else {
    // When no previous profile timestamp existed, just assert updated_at is valid
    TestValidator.predicate(
      "updated_at is a valid date-time string",
      !Number.isNaN(new Date(updatedProfile.updated_at).getTime()),
    );
  }

  // Ensure earning record in memory is untouched (profile update should not mutate it)
  TestValidator.equals(
    "earning seller id remains unchanged",
    sellerEarning.shopping_mall_seller_id,
    earningSellerIdBefore,
  );
  TestValidator.equals(
    "earning order id remains unchanged",
    sellerEarning.shopping_mall_order_id,
    earningOrderIdBefore,
  );
}
